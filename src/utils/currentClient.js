import { supabase } from "./supabase";

export async function getActiveClient() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return { error: "You must be logged in to place an order." };
  }

  const uid = userData.user.id;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("uid, username, balance")
    .eq("uid", uid)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: "Client profile not found." };
  }

  const username = profile.username || userData.user.user_metadata?.username || "user";
  return {
    uid,
    username,
    clientHandle: `@${username}`,
    balance: Number(profile.balance || 0)
  };
}

export async function chargeClientBalance(uid, currentBalance, amount) {
  const cost = Number(amount || 0);
  if (currentBalance < cost) {
    return {
      error: `Insufficient balance ($${currentBalance.toFixed(2)}) for this $${cost.toFixed(2)} item.`
    };
  }

  const nextBalance = Number((currentBalance - cost).toFixed(2));
  const { error } = await supabase
    .from("profiles")
    .update({ balance: nextBalance })
    .eq("uid", uid);

  if (error) {
    return { error: "Failed to deduct balance: " + error.message };
  }

  return { nextBalance };
}