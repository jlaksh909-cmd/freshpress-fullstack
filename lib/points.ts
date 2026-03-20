import { createClient } from "./supabase/client"

export const POINTS_PER_RUPEE = 0.1 // 1 point per 10 INR
export const RUPEES_PER_POINT = 0.1 // 10 points = 1 INR (100 points = 10 INR)
export const REFERRAL_BONUS_REFERRER = 500
export const REFERRAL_BONUS_NEW_USER = 200

export async function getUserPoints(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("user_points")
    .select("balance, lifetime_earned")
    .eq("user_id", userId)
    .single()

  if (error && error.code === "PGRST116") {
    // No points record yet, return 0
    return { balance: 0, lifetime_earned: 0 }
  }
  return data || { balance: 0, lifetime_earned: 0 }
}

export async function addPoints(userId: string, amount: number, description: string, orderId?: string) {
  const supabase = createClient()
  
  // 1. Get current balance or initialize
  const { data: current, error: getError } = await supabase
    .from("user_points")
    .select("balance, lifetime_earned")
    .eq("user_id", userId)
    .single()

  if (getError && getError.code !== "PGRST116") throw getError

  const newBalance = (current?.balance || 0) + amount
  const newLifetime = (current?.lifetime_earned || 0) + (amount > 0 ? amount : 0)

  // 2. Update/Insert balance
  const { error: upsertError } = await supabase
    .from("user_points")
    .upsert({
      user_id: userId,
      balance: newBalance,
      lifetime_earned: newLifetime,
      updated_at: new Date().toISOString()
    })

  if (upsertError) throw upsertError

  // 3. Record history
  const { error: histError } = await supabase
    .from("points_history")
    .insert({
      user_id: userId,
      amount: amount,
      transaction_type: amount > 0 ? 'earned' : 'redeemed',
      description: description,
      order_id: orderId
    })

  if (histError) throw histError

  return { balance: newBalance }
}

export function calculatePoints(totalAmount: number, subscriptionName?: string) {
  let multiplier = 1.0
  if (subscriptionName === 'Gold') multiplier = 1.5
  if (subscriptionName === 'Platinum') multiplier = 2.0
  
  return Math.floor(totalAmount * POINTS_PER_RUPEE * multiplier)
}

export function generateReferralCode(name: string) {
  const cleanName = (name || 'USER').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `FP-${cleanName}-${randomStr}`
}

export async function processReferral(newUserId: string, referralCode: string) {
  if (!referralCode) return
  const supabase = createClient()

  // 1. Find referrer
  const { data: referrer, error: refError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("referral_code", referralCode.toUpperCase().trim())
    .single()

  if (refError || !referrer) {
    console.error("Invalid referral code")
    return
  }

  // 2. Link users
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ referred_by: referrer.id })
    .eq("id", newUserId)

  if (updateError) throw updateError

  // 3. Award points
  await addPoints(referrer.id, REFERRAL_BONUS_REFERRER, `Referral Bonus for inviting user #${newUserId.slice(0,8)}`)
  await addPoints(newUserId, REFERRAL_BONUS_NEW_USER, `Welcome Bonus from ${referrer.full_name || 'a friend'}`)
  
  return { referrerName: referrer.full_name || 'User' }
}
