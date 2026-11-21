import { getPool, query } from '../db.ts';
import type { Order, OrderPaymentInfo } from '../../src/types/findkart.ts';

export async function createPaymentRecord(params: {
  sessionId: string;
  userId?: string;
  provider: 'razorpay' | 'sandbox';
  razorpayOrderId?: string;
  paymentMethod: string;
  amount: number;
  amountPaise: number;
}): Promise<void> {
  await query(
    `INSERT INTO payments (
      session_id, user_id, provider, razorpay_order_id,
      payment_method, amount, amount_paise, currency, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'INR', 'created')
    ON CONFLICT (session_id) DO NOTHING`,
    [
      params.sessionId,
      params.userId || null,
      params.provider,
      params.razorpayOrderId || null,
      params.paymentMethod,
      params.amount,
      params.amountPaise,
    ]
  );
}

export async function markPaymentFailed(sessionId: string, failureReason: string): Promise<void> {
  await query(
    `UPDATE payments
     SET status = 'failed',
         payment_details = COALESCE(payment_details, '{}'::jsonb) || $1::jsonb,
         updated_at = NOW()
     WHERE session_id = $2`,
    [JSON.stringify({ failureReason, failedAt: new Date().toISOString() }), sessionId]
  );
}

export async function verifyAndCompletePaymentOrder(params: {
  sessionId: string;
  order: Order;
  userId?: string;
  paymentInfo: OrderPaymentInfo;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  stockUpdates: Record<string, number>;
}): Promise<Order> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO orders (
        order_id, user_id, created_at, status,
        payment_status, payment_method, payment_gateway,
        razorpay_order_id, razorpay_payment_id, razorpay_signature,
        payment_info, paid_at,
        subtotal, delivery_fee, total_savings, total,
        shipping, items
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9, $10,
        $11::jsonb, $12,
        $13, $14, $15, $16,
        $17::jsonb, $18::jsonb
      )`,
      [
        params.order.orderId,
        params.userId || null,
        params.order.createdAt,
        params.order.status,
        params.paymentInfo.paymentStatus,
        params.order.shipping.paymentMethod,
        params.paymentInfo.gateway,
        params.razorpayOrderId || null,
        params.razorpayPaymentId || null,
        params.razorpaySignature || null,
        JSON.stringify(params.paymentInfo),
        params.paymentInfo.paidAt || new Date().toISOString(),
        params.order.subtotal,
        params.order.deliveryFee,
        params.order.totalSavings,
        params.order.total,
        JSON.stringify(params.order.shipping),
        JSON.stringify(params.order.items),
      ]
    );

    await client.query(
      `UPDATE payments
       SET order_id = $1,
           razorpay_payment_id = COALESCE($2, razorpay_payment_id),
           razorpay_signature = COALESCE($3, razorpay_signature),
           status = 'paid',
           payment_details = $4::jsonb,
           verified_at = NOW(),
           updated_at = NOW()
       WHERE session_id = $5`,
      [
        params.order.orderId,
        params.razorpayPaymentId || null,
        params.razorpaySignature || null,
        JSON.stringify(params.paymentInfo),
        params.sessionId,
      ]
    );

    for (const [productId, stock] of Object.entries(params.stockUpdates)) {
      await client.query(
        `INSERT INTO stock_overrides (product_id, stock, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (product_id)
         DO UPDATE SET stock = EXCLUDED.stock, updated_at = NOW()`,
        [productId, stock]
      );
    }

    if (params.userId) {
      await client.query(
        `UPDATE users SET cart = '[]'::jsonb, city = $1, pincode = $2 WHERE id = $3`,
        [params.order.shipping.city, params.order.shipping.pincode, params.userId]
      );
    }

    await client.query('COMMIT');
    return params.order;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function createOrder(order: Order, userId?: string): Promise<Order> {
  const paymentInfo = order.paymentInfo || order.shipping?.paymentDetails;
  await query(
    `INSERT INTO orders (
      order_id, user_id, created_at, status,
      payment_status, payment_method, payment_gateway,
      payment_info, paid_at,
      subtotal, delivery_fee, total_savings, total,
      shipping, items
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb)`,
    [
      order.orderId,
      userId || null,
      order.createdAt,
      order.status,
      paymentInfo?.paymentStatus || 'Pay on Delivery',
      order.shipping.paymentMethod,
      paymentInfo?.gateway || 'Pay on Delivery',
      JSON.stringify(paymentInfo || {}),
      paymentInfo?.paidAt || null,
      order.subtotal,
      order.deliveryFee,
      order.totalSavings,
      order.total,
      JSON.stringify(order.shipping),
      JSON.stringify(order.items),
    ]
  );

  // If authenticated user placed order, clear their cart in DB
  if (userId) {
    await query(
      `UPDATE users SET cart = '[]'::jsonb, city = $1, pincode = $2 WHERE id = $3`,
      [order.shipping.city, order.shipping.pincode, userId]
    );
  }

  return order;
}

export async function getOrdersByUserId(userId: string): Promise<Order[]> {
  const res = await query(
    `SELECT order_id as "orderId", created_at as "createdAt", status,
            subtotal::float, delivery_fee::float as "deliveryFee",
            total_savings::float as "totalSavings", total::float,
            shipping, items,
            COALESCE(NULLIF(payment_info, '{}'::jsonb), shipping->'paymentDetails') as "paymentInfo"
     FROM orders
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return res.rows.map((row) => ({
    ...row,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  })) as Order[];
}

export async function updateOrderStatus(
  orderId: string,
  userId: string,
  status: string
): Promise<boolean> {
  const res = await query(
    `UPDATE orders SET status = $1 WHERE order_id = $2 AND user_id = $3 RETURNING order_id`,
    [status, orderId, userId]
  );
  return res.rows.length > 0;
}
