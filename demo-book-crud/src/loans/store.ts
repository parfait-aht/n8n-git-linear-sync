export interface Loan {
  id: number;
  bookId: number;
  borrowerName: string;
  returnedAt: string | null;
}

type LoanInput = { bookId: number; borrowerName: string };

let loans: Loan[] = [];
let nextId = 1;

export function list(): Loan[] {
  return loans;
}

export function get(id: number): Loan | undefined {
  return loans.find((loan) => loan.id === id);
}

export function create({ bookId, borrowerName }: LoanInput): Loan {
  const loan: Loan = { id: nextId++, bookId, borrowerName, returnedAt: null };
  loans.push(loan);
  return loan;
}

export function markReturned(id: number, returnedAt: string): Loan | null {
  const loan = get(id);
  if (!loan) return null;
  loan.returnedAt = returnedAt;
  return loan;
}

export function remove(id: number): boolean {
  const index = loans.findIndex((loan) => loan.id === id);
  if (index === -1) return false;
  loans.splice(index, 1);
  return true;
}
