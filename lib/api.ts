import { supabase } from './supabase';
import { Account, AccountBalance, DashboardSummary, AccountStatement, VehicleDefinition } from './types';

// ============================================================================
// ACCOUNTS
// ============================================================================

export async function fetchAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('nom_compte', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchAccount(id: string): Promise<Account> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createAccount(account: Omit<Account, 'id' | 'created_at' | 'updated_at'>): Promise<Account> {
  const { data, error } = await supabase
    .from('accounts')
    .insert([account])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAccount(id: string, account: Partial<Account>): Promise<Account> {
  const { data, error } = await supabase
    .from('accounts')
    .update(account)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// ACCOUNT BALANCES
// ============================================================================

export async function fetchAccountBalances(): Promise<AccountBalance[]> {
  const { data, error } = await supabase
    .from('account_balances')
    .select('*')
    .order('nom_compte', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchAccountBalance(accountId: string): Promise<AccountBalance> {
  const { data, error } = await supabase
    .from('account_balances')
    .select('*')
    .eq('account_id', accountId)
    .single();

  if (error) throw error;
  return data;
}

export async function calculateBalance(accountId: string): Promise<number> {
  const { data, error } = await supabase.rpc('calculate_account_balance', {
    p_account_id: accountId,
  });

  if (error) throw error;
  return data as number;
}

// ============================================================================
// DASHBOARD
// ============================================================================

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data, error } = await supabase.rpc('get_dashboard_summary');

  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as DashboardSummary;
}

// ============================================================================
// STATEMENTS
// ============================================================================

export async function fetchAccountStatement(
  accountId: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<AccountStatement[]> {
  const { data, error } = await supabase.rpc('get_account_statement', {
    p_account_id: accountId,
    p_date_from: dateFrom?.toISOString() || null,
    p_date_to: dateTo?.toISOString() || null,
  });

  if (error) throw error;
  return data || [];
}

// ============================================================================
// RECEPTIONS & LIVRAISONS
// ============================================================================

export async function fetchOperations() {
  const { data, error } = await supabase
    .from('receptions_livraisons')
    .select('*')
    .order('date_operation', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createOperation(operation: any) {
  const { data, error } = await supabase
    .from('receptions_livraisons')
    .insert([operation])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteOperation(id: string) {
  const { error } = await supabase
    .from('receptions_livraisons')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// CHARGES
// ============================================================================

export async function fetchCharges() {
  const { data, error } = await supabase
    .from('charges')
    .select('*')
    .order('date_charge', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createCharge(charge: any) {
  const { data, error } = await supabase
    .from('charges')
    .insert([charge])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCharge(id: string) {
  const { error } = await supabase
    .from('charges')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// AUTH
// ============================================================================

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}

// ============================================================================
// PAYMENTS
// ============================================================================

export async function fetchPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('date_paiement', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createPayment(payment: any) {
  const { data, error } = await supabase
    .from('payments')
    .insert([payment])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePayment(id: string) {
  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// VEHICLE DEFINITIONS
// ============================================================================

export async function fetchVehicleDefinitions(): Promise<VehicleDefinition[]> {
  const { data, error } = await supabase
    .from('vehicules_ref')
    .select('*')
    .order('marque', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createVehicleDefinition(def: Omit<VehicleDefinition, 'id'>): Promise<VehicleDefinition> {
  const { data, error } = await supabase
    .from('vehicules_ref')
    .insert([def])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteVehicleDefinition(id: string): Promise<void> {
  const { error } = await supabase
    .from('vehicules_ref')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
