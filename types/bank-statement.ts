export interface BankStatement {
  id: string;
  user_id: string;
  name: string;
  ic_number: string;
  bank_name: string;
  bank_account_number: string;
  statement_file_url: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BankStatementFormData {
  name: string;
  ic_number: string;
  bank_name: string;
  bank_account_number: string;
}

export interface BankStatementWithUser extends BankStatement {
  user_profiles?: {
    full_name: string;
    email: string;
  };
}
