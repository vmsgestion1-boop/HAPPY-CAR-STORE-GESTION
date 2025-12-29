// Types for VMS Gestion application

export interface Account {
  id: string;
  code_compte: string;
  nom_compte: string;
  type_compte: 'client' | 'fournisseur' | 'interne';
  solde_initial: number;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface Reception {
  id: string;
  created_at: string;
  date_operation: string;
  type_operation: 'reception' | 'livraison';
  account_id: string;
  montant: number;
  quantite: number;
  // Vehicle Details
  marque?: string;
  modele?: string;
  numero_chassis?: string;
  prix_achat?: number;
  prix_vente?: number;
  commission?: number;
}

export interface VehicleDefinition {
  id: string;
  marque: string;
  modele: string;
  reference?: string;
  prix_achat_defaut?: number;
}

export interface Charge {
  id: string;
  account_id: string;
  date_charge: string;
  description: string;
  montant: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  date_operation: string;
  type: 'charge' | 'reception' | 'livraison';
  reference_id: string;
  montant: number;
  created_at: string;
}

export interface AccountBalance {
  account_id: string;
  code_compte: string;
  nom_compte: string;
  type_compte: string;
  solde_initial: number;
  total_mouvements: number;
  solde_actuel: number;
  derniere_operation: string | null;
  actif: boolean;
}

export interface AccountStatement {
  transaction_id: string;
  date_operation: string;
  type_operation: string;
  reference_id: string;
  montant: number;
  solde_cumule: number;
}

export interface DashboardSummary {
  total_accounts: number;
  total_balance: number;
  total_receptions: number;
  total_livraisons: number;
  total_charges: number;
  active_accounts: number;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'viewer';
  created_at: string;
}

export interface AuditLog {
  id: string;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  changed_by: string | null;
  changed_at: string;
}

export interface Payment {
  id: string;
  account_id: string;
  date_paiement: string;
  montant: number;
  type_paiement: 'encaissement' | 'decaissement';
  mode_paiement: string;
  reference: string;
  description: string;
  created_at: string;
}
