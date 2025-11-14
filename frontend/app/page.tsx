'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useUIStore } from '@/stores/ui-store';
import { api } from '@/lib/axios';
import { PLANS, API_ENDPOINTS } from '@/lib/constants';
import {
  CheckIcon,
  XMarkIcon,
  LinkIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  BoltIcon,
  GlobeAltIcon,
  QrCodeIcon,
  ClipboardDocumentCheckIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';

// Types
interface ShortenedLinkData {
  slug: string;
  originalUrl: string;
  shortUrl: string;
  qrCode?: string;
  metadata?: {
    title?: string;
    description?: string;
    favicon?: string;
  };
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [shortenedLink, setShortenedLink] = useState<ShortenedLinkData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [cookieConsent, setCookieConsent] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const { theme, setTheme } = useUIStore();

  useEffect(() => {
    // Check cookie consent
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setCookieConsent(false);
    }
  }, []);

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShortenedLink(null);

    try {
      const response = await api.post(API_ENDPOINTS.LINKS.CREATE, {
        originalUrl: url,
        customSlug: customSlug || undefined,
      });

      const data = response.data.data.link;

      setShortenedLink({
        slug: data.slug,
        originalUrl: data.originalUrl,
        shortUrl: data.shortUrl,
        qrCode: data.qrCode,
        metadata: data.metadata,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to shorten URL. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (shortenedLink) {
      await navigator.clipboard.writeText(shortenedLink.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAcceptCookies = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setCookieConsent(true);
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md dark:bg-gray-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600"></div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              ShortLinks
            </h1>
          </Link>
          <nav className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <MoonIcon className="h-5 w-5" />
              ) : (
                <SunIcon className="h-5 w-5" />
              )}
            </button>
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Sign Up Free
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl lg:text-7xl">
              Shorten Links.
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Track Everything.
              </span>
            </h2>
            <p className="mx-auto mb-12 max-w-3xl text-lg text-gray-600 dark:text-gray-300 sm:text-xl">
              Create powerful short links with advanced analytics. Track clicks, understand your audience,
              and grow your business with data-driven insights.
            </p>
          </motion.div>

          {/* URL Shortener Widget */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto max-w-4xl"
          >
            <form
              onSubmit={handleShorten}
              className="mb-8 rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800 sm:p-8"
            >
              <div className="mb-4 flex flex-col gap-4 sm:flex-row">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste your long URL here..."
                  required
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-indigo-600 px-8 py-3 font-semibold text-white transition-all hover:bg-indigo-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Shortening...
                    </span>
                  ) : (
                    'Shorten URL'
                  )}
                </button>
              </div>

              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400">
                  Advanced Options
                </summary>
                <div className="mt-4">
                  <input
                    type="text"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value)}
                    placeholder="Custom slug (optional)"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  />
                </div>
              </details>

              {error && (
                <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}
            </form>

            {/* Shortened URL Display */}
            {shortenedLink && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800"
              >
                <p className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Your shortened link:
                </p>
                <div className="mb-4 flex items-center gap-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                  <LinkIcon className="h-5 w-5 flex-shrink-0 text-indigo-600 dark:text-indigo-400" />
                  <a
                    href={shortenedLink.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 truncate text-lg font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {shortenedLink.shortUrl}
                  </a>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <ClipboardDocumentCheckIcon className="h-4 w-4" />
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <QrCodeIcon className="h-4 w-4" />
                    {showQR ? 'Hide QR Code' : 'Show QR Code'}
                  </button>
                  <Link
                    href="/register"
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                  >
                    View Analytics
                  </Link>
                </div>

                {showQR && shortenedLink.qrCode && (
                  <div className="mt-4 flex justify-center">
                    <div className="rounded-lg bg-white p-4">
                      <Image
                        src={shortenedLink.qrCode}
                        alt="QR Code"
                        width={200}
                        height={200}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mx-auto mt-20 grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-3"
          >
            {[
              {
                icon: BoltIcon,
                title: 'Lightning Fast',
                description: 'Create and share short links in milliseconds with our optimized infrastructure.',
              },
              {
                icon: ChartBarIcon,
                title: 'Powerful Analytics',
                description: 'Track clicks, geographic data, devices, and more with real-time insights.',
              },
              {
                icon: ShieldCheckIcon,
                title: 'Secure & Reliable',
                description: 'Enterprise-grade security with 99.9% uptime guarantee and DDoS protection.',
              },
              {
                icon: GlobeAltIcon,
                title: 'Custom Domains',
                description: 'Use your own domain for branded short links that build trust.',
              },
              {
                icon: QrCodeIcon,
                title: 'QR Codes',
                description: 'Generate QR codes automatically for offline marketing campaigns.',
              },
              {
                icon: LinkIcon,
                title: 'Link Management',
                description: 'Organize, edit, and manage all your links from a central dashboard.',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="rounded-xl bg-white p-6 shadow-lg transition-shadow hover:shadow-xl dark:bg-gray-800"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900">
                  <feature.icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-white py-20 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white">
              Simple, Transparent Pricing
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
              Choose the perfect plan for your needs. Upgrade, downgrade, or cancel anytime.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-4">
            {Object.entries(PLANS).map(([key, plan]) => (
              <div
                key={key}
                className={`relative rounded-2xl border-2 p-8 ${
                  plan.id === 'pro'
                    ? 'border-indigo-600 shadow-xl dark:border-indigo-400'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {plan.id === 'pro' && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1 text-sm font-semibold text-white">
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-5xl font-bold text-gray-900 dark:text-white">
                      ${plan.price}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">/month</span>
                  </div>
                </div>

                <ul className="mb-8 space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckIcon className="h-5 w-5 flex-shrink-0 text-green-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {plan.features.maxLinks === -1 ? 'Unlimited' : plan.features.maxLinks} links
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckIcon className="h-5 w-5 flex-shrink-0 text-green-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {plan.features.maxClicksPerLink === -1 ? 'Unlimited' : plan.features.maxClicksPerLink.toLocaleString()} clicks per link
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    {plan.features.customSlug ? (
                      <CheckIcon className="h-5 w-5 flex-shrink-0 text-green-500" />
                    ) : (
                      <XMarkIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Custom slugs
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    {plan.features.customDomain ? (
                      <CheckIcon className="h-5 w-5 flex-shrink-0 text-green-500" />
                    ) : (
                      <XMarkIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Custom domain
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckIcon className="h-5 w-5 flex-shrink-0 text-green-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {plan.features.analytics} analytics
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    {plan.features.apiAccess ? (
                      <CheckIcon className="h-5 w-5 flex-shrink-0 text-green-500" />
                    ) : (
                      <XMarkIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      API access
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckIcon className="h-5 w-5 flex-shrink-0 text-green-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {plan.features.teamMembers === -1 ? 'Unlimited' : plan.features.teamMembers} team {plan.features.teamMembers === 1 ? 'member' : 'members'}
                    </span>
                  </li>
                </ul>

                <Link
                  href="/register"
                  className={`block w-full rounded-lg px-6 py-3 text-center font-semibold transition-colors ${
                    plan.id === 'pro'
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {plan.price === 0 ? 'Get Started' : 'Start Free Trial'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white">
              Trusted by Thousands
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
              See what our customers have to say about ShortLinks.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: 'Sarah Johnson',
                role: 'Marketing Director',
                company: 'TechCorp Inc.',
                avatar: 'SJ',
                rating: 5,
                text: 'ShortLinks has transformed how we track our marketing campaigns. The analytics are incredibly detailed and easy to understand.',
              },
              {
                name: 'Michael Chen',
                role: 'Social Media Manager',
                company: 'Digital Agency',
                avatar: 'MC',
                rating: 5,
                text: 'The custom domain feature is a game-changer. Our branded links have increased click-through rates by 40%!',
              },
              {
                name: 'Emily Rodriguez',
                role: 'E-commerce Owner',
                company: 'FashionHub',
                avatar: 'ER',
                rating: 5,
                text: 'Best link shortener I have used. The QR code feature is perfect for our offline marketing materials.',
              },
              {
                name: 'David Park',
                role: 'Product Manager',
                company: 'StartupXYZ',
                avatar: 'DP',
                rating: 5,
                text: 'The API is well-documented and easy to integrate. We use it for all our product launch campaigns.',
              },
              {
                name: 'Lisa Anderson',
                role: 'Content Creator',
                company: 'MediaPro',
                avatar: 'LA',
                rating: 5,
                text: 'Real-time analytics help me understand my audience better. The geographic data is particularly useful.',
              },
              {
                name: 'James Wilson',
                role: 'Growth Hacker',
                company: 'GrowthCo',
                avatar: 'JW',
                rating: 5,
                text: 'Excellent value for money. The Pro plan has everything we need to scale our growth campaigns.',
              },
            ].map((testimonial, index) => (
              <div
                key={index}
                className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800"
              >
                <div className="mb-4 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
                <div className="mb-3 flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i} className="h-5 w-5 text-yellow-400" />
                  ))}
                </div>
                <p className="mb-3 text-gray-600 dark:text-gray-400">
                  {testimonial.text}
                </p>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-500">
                  {testimonial.company}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white py-20 dark:bg-gray-800">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Everything you need to know about ShortLinks.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                question: 'What is ShortLinks?',
                answer: 'ShortLinks is a powerful URL shortening service that helps you create, track, and manage short links. With advanced analytics, custom domains, and QR codes, it is perfect for marketers, businesses, and content creators.',
              },
              {
                question: 'How does link shortening work?',
                answer: 'Simply paste your long URL into our shortener, and we will create a short, memorable link for you. You can customize the slug, add password protection, set expiration dates, and track all clicks in real-time.',
              },
              {
                question: 'Is there a free plan?',
                answer: 'Yes! Our free plan includes 50 links with 1,000 clicks per link, custom slugs, basic analytics, and QR codes. It is perfect for personal use or trying out the service.',
              },
              {
                question: 'Can I use my own domain?',
                answer: 'Absolutely! Pro, Business, and Enterprise plans include custom domain support. You can use your own domain to create branded short links that build trust with your audience.',
              },
              {
                question: 'What analytics do you provide?',
                answer: 'We track comprehensive analytics including total clicks, unique visitors, geographic location, device types, operating systems, browsers, referrer sources, and time-based trends. Pro+ plans get advanced analytics with custom reports.',
              },
              {
                question: 'How secure are my links?',
                answer: 'Very secure! We use enterprise-grade security, SSL encryption, DDoS protection, and optional password protection for links. All data is encrypted and we never share your information.',
              },
              {
                question: 'Can I edit or delete links?',
                answer: 'Yes! You have full control over your links. Edit the destination URL, update settings, or delete links anytime from your dashboard.',
              },
              {
                question: 'Do you offer an API?',
                answer: 'Yes! Pro and higher plans include API access with comprehensive documentation. Integrate link shortening directly into your applications and workflows.',
              },
              {
                question: 'What happens if I exceed my plan limits?',
                answer: 'We will notify you when you are approaching your limits. You can upgrade anytime to a higher plan. Links will continue to work, but you may need to upgrade to create new ones.',
              },
              {
                question: 'Can I cancel anytime?',
                answer: 'Yes! There are no long-term contracts. You can upgrade, downgrade, or cancel your subscription anytime. Your links will remain active.',
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="flex w-full items-center justify-between bg-gray-50 px-6 py-4 text-left transition-colors hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {faq.question}
                  </span>
                  <svg
                    className={`h-5 w-5 transform text-gray-500 transition-transform ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {openFaq === index && (
                  <div className="bg-white px-6 py-4 dark:bg-gray-800">
                    <p className="text-gray-600 dark:text-gray-400">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-6 text-4xl font-bold text-gray-900 dark:text-white">
            Ready to Get Started?
          </h2>
          <p className="mb-8 text-lg text-gray-600 dark:text-gray-300">
            Join thousands of marketers, businesses, and creators using ShortLinks to grow their reach.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-indigo-700 hover:shadow-lg"
            >
              Start Free Trial
            </Link>
            <Link
              href="#pricing"
              className="rounded-lg border-2 border-gray-300 px-8 py-4 text-lg font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Google AdSense Placeholders */}
      {/*
        AdSense Integration Instructions:
        1. Sign up for Google AdSense
        2. Get your publisher ID
        3. Replace these divs with actual AdSense code
        4. Common ad sizes: 728x90 (leaderboard), 300x250 (rectangle), 160x600 (skyscraper)
      */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Leaderboard Ad - 728x90 */}
        <div className="mx-auto mb-8 flex h-[90px] max-w-[728px] items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500">Ad Space (728x90)</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {/* Company Info */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600"></div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  ShortLinks
                </h3>
              </div>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Professional URL shortening service with powerful analytics and custom domains.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-gray-600 hover:text-indigo-600 dark:text-gray-400">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                  </svg>
                </a>
                <a href="#" className="text-gray-600 hover:text-indigo-600 dark:text-gray-400">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </a>
                <a href="#" className="text-gray-600 hover:text-indigo-600 dark:text-gray-400">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="mb-4 font-semibold text-gray-900 dark:text-white">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/features" className="text-gray-600 hover:text-indigo-600 dark:text-gray-400">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="text-gray-600 hover:text-indigo-600 dark:text-gray-400">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/api" className="text-gray-600 hover:text-indigo-600 dark:text-gray-400">
                    API
                  </Link>
                </li>
                <li>
                  <Link href="/integrations" className="text-gray-600 hover:text-indigo-600 dark:text-gray-400">
                    Integrations
                  </Link>
                </li>
                <li>
                  <Link href="/analytics" className="text-gray-600 hover:text-indigo-600 dark:text-gray-400">
                    Analytics
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="mb-4 font-semibold text-gray-900 dark:text-white">Company</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="text-gray-600 hover:text-indigo-600 dark:text-gray-400">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-gray-600 hover:text-indigo-600 dark:text-gray-400">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="text-gray-600 hover:text-indigo-600 dark:text-gray-400">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-600 hover:text-indigo-600 dark:text-gray-400">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/press" className="text-gray-600 hover:text-indigo-600 dark:text-gray-400">
                    Press
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources Links */}
            <div>
              <h4 className="mb-4 font-semibold text-gray-900 dark:text-white">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/docs" className="text-gray-600 hover:text-indigo-600 dark:text-gray-400">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="/help" className="text-gray-600 hover:text-indigo-600 dark:text-gray-400">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/tutorials" className="text-gray-600 hover:text-indigo-600 dark:text-gray-400">
                    Tutorials
                  </Link>
                </li>
                <li>
                  <Link href="/status" className="text-gray-600 hover:text-indigo-600 dark:text-gray-400">
                    System Status
                  </Link>
                </li>
                <li>
                  <Link href="/changelog" className="text-gray-600 hover:text-indigo-600 dark:text-gray-400">
                    Changelog
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-gray-200 pt-8 dark:border-gray-700">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                © 2025 ShortLinks. All rights reserved.
              </p>
              <div className="flex gap-6 text-sm">
                <Link href="/privacy" className="text-gray-600 hover:text-indigo-600 dark:text-gray-400">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-gray-600 hover:text-indigo-600 dark:text-gray-400">
                  Terms of Service
                </Link>
                <Link href="/cookies" className="text-gray-600 hover:text-indigo-600 dark:text-gray-400">
                  Cookie Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Cookie Consent Banner */}
      {!cookieConsent && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 p-4 shadow-lg">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 text-sm">
            <p className="text-gray-300">
              We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.{' '}
              <Link href="/cookies" className="underline">
                Learn more
              </Link>
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleAcceptCookies}
                className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-700"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
