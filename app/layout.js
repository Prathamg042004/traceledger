import './globals.css';
export const metadata = {
  title: 'TraceLedger — Evidence-first document intelligence',
  description: 'Turn business documents into reviewable, evidence-linked structured data. Extract, validate, reconcile and export.'
};
export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
