import { Hono } from 'hono';
import { books } from './books/routes.js';
import { authors } from './authors/routes.js';
import { reviews } from './reviews/routes.js';

export const app = new Hono();
app.route('/books', books);
app.route('/authors', authors);
app.route('/reviews', reviews);
