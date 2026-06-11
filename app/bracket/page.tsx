import { redirect } from 'next/navigation';

// Redirect to new /torneo page
export default function BracketRedirect() {
  redirect('/torneo');
}
