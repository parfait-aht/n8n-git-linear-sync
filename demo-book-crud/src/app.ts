import { Hono } from 'hono';
import { books } from './books/routes.js';
import { authors } from './authors/routes.js';

export const app = new Hono();
app.route('/books', books);
app.route('/authors', authors);
