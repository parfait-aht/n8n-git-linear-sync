export interface Review {
  id: number;
  bookId: number;
  rating: number;
  comment?: string;
}

type ReviewInput = { bookId: number; rating: number; comment?: string };

let reviews: Review[] = [];
let nextId = 1;

export function list(): Review[] {
  return reviews;
}

export function get(id: number): Review | undefined {
  return reviews.find((review) => review.id === id);
}

export function create({ bookId, rating, comment }: ReviewInput): Review {
  const review: Review = { id: nextId++, bookId, rating, comment };
  reviews.push(review);
  return review;
}

export function remove(id: number): boolean {
  const index = reviews.findIndex((review) => review.id === id);
  if (index === -1) return false;
  reviews.splice(index, 1);
  return true;
}
