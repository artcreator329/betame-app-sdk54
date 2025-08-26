export interface BankStatement {
  id: string;
  user_id: string;
  name: string;
  ic_number: string;
  bank_name: string;
  bank_account_number: string;
  statement_file_url: string;
  nomad_visa_file_url?: string;
  nomad_visa_required: boolean;
  nomad_visa_uploaded: boolean;
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
  nomad_visa_required?: boolean;
}

export interface BankStatementWithUser extends BankStatement {
  user_profiles?: {
    full_name: string;
    email: string;
  };
}
