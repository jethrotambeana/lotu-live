import ContactForm from '@/components/ContactForm';
import PageBanner from '@/components/PageBanner';

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
