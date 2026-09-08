import type { Metadata } from 'next';
import ContactForm from '@/components/ContactForm';
import PageBanner from '@/components/PageBanner';

const TITLE = 'Contact Us — LOTU.LIVE';
const DESCRIPTION = 'Questions, feedback, prayer requests or partnerships — get in touch with LOTU.LIVE.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/banner-contact.jpg', width: 2048, height: 768 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/banner-contact.jpg'],
  },
};

export default function ContactPage() {
  return (
    <>
      <PageBanner src="/banner-contact.jpg" mobileSrc="/banner-contact-mobile.jpg" alt="Contact Us — LOTU.LIVE" />
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-2 text-2xl font-bold">Contact Us</h1>
        <p className="mb-6 text-slate-600">
          Have a question, or want to add your church to LOTU.LIVE? Send us a message below.
        </p>
        <ContactForm />
      </div>
    </>
  );
}
