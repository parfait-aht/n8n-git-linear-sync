import { Hono } from 'hono';
import { books } from './books/routes.js';
import { authors } from './authors/routes.js';
import { reviews } from './reviews/routes.js';
import { health } from './health/routes.js';
import { loans } from './loans/routes.js';

export const app = new Hono();
app.route('/books', books);
app.route('/authors', authors);
app.route('/reviews', reviews);
app.route('/health', health);
app.route('/loans', loans);
