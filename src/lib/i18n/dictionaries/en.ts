import type { Dictionary } from "./index";

/** Debe cumplir exactamente la misma forma que el diccionario espanol. */
export const en: Dictionary = {
  htmlLang: "en",

  meta: {
    home: {
      title: "Private Client Galleries for Photographers | Festora",
      description:
        "Deliver your client's photos in a private, PIN-protected gallery. Clients pick favorites and download every original. AI photo search included. Free account.",
    },
    howItWorks: {
      title: "How to Deliver Photos to a Client | Festora",
      description:
        "A four-step guide to delivering a shoot: create the project, upload the photos, share the PIN-protected link and get your client's selection back.",
    },
    pricing: {
      title: "Pricing: Free 5 GB Account | Festora",
      description:
        "Festora has a free account with 5 GB of storage, unlimited projects, PIN-protected galleries, client favorites, bulk download and AI photo search.",
    },
    faq: {
      title: "Frequently Asked Questions | Festora",
      description:
        "How gallery sharing works, who can see the photos, how the PIN works, bulk downloads, AI search and what the free account includes.",
    },
  },

  nav: {
    home: "Home",
    howItWorks: "How it works",
    pricing: "Pricing",
    faq: "FAQ",
    dashboard: "Dashboard",
    goToDashboard: "Go to dashboard",
    signIn: "Sign in",
    startFree: "Start free",
    skipToContent: "Skip to content",
    languageLabel: "Change language",
    mainNav: "Main navigation",
    footerNav: "Footer links",
    otherLanguage: "Español",
  },

  hero: {
    h1: "Private client galleries for photographers",
    subtitle:
      "Upload the shoot, share one PIN-protected link, and let your client mark favorites and download the originals. AI search finds any photo in seconds.",
    ctaPrimary: "Start free",
    ctaSecondary: "See how it works",
    freeNote: "Free account with 5 GB. No card required.",
  },

  definition: {
    heading: "What Festora is",
    body: "Festora is a web platform where a photographer uploads the photos from a shoot and delivers them to the client in a private gallery protected by a PIN. The client marks favorites and downloads the originals as a ZIP. Natural-language AI photo search is built in.",
  },

  features: {
    heading: "Everything you need to deliver a shoot",
    subheading:
      "Festora is not a shared folder with a nicer name. It is the place you send your client to when the work is ready.",
    items: [
      {
        title: "Private gallery with a unique link and PIN",
        body: "Every project lives at an eight-character address nobody can guess. When the job calls for it, add a PIN and only the people who have it get in.",
      },
      {
        title: "Your client marks their favorites",
        body: "Clients pick the photos they want with one click and you see the list in your dashboard, ready to edit. No more file names sent over WhatsApp.",
      },
      {
        title: "Download every photo, whatever the size",
        body: "The ZIP is built in the client's browser, not on a server: a 5 GB delivery downloads as smoothly as a 200 MB one, with a progress bar that means something.",
      },
      {
        title: "Natural-language AI search",
        body: "Type what you are looking for (the toast, the grandmother's hug, the details of the dress) and the gallery finds it. Nothing has to be tagged by hand.",
      },
      {
        title: "AI-suggested albums",
        body: "Every photo is analyzed on upload: scene, composition, sharpness. Festora proposes groupings and surfaces the strongest frames so you decide faster.",
      },
      {
        title: "Photos never sit on a public URL",
        body: "The bucket is private and each image is served through short-lived signed links. Delete the project and the files leave storage with it.",
      },
    ],
  },

  steps: {
    eyebrow: "How it works",
    heading: "From memory card to client in four steps",
    intro:
      "This is how a shoot gets delivered in Festora. No install, no plugin: it all happens in the browser.",
    items: [
      {
        title: "Create the project",
        body: "Give it a name, the client's name, the type of shoot and the date. Festora generates an eight-character gallery link.",
      },
      {
        title: "Upload the photos",
        body: "Drag the files in and they go straight to storage from your browser. Thumbnails are generated on your machine, so the upload never waits on a server.",
      },
      {
        title: "Share the link",
        body: "Copy the gallery address and send it to your client. Add a PIN if you want one: without it, the gallery will not open.",
      },
      {
        title: "Get the selection back",
        body: "Your client browses, marks favorites and downloads what they need. You see the selection in your dashboard and download it already filtered.",
      },
    ],
    closing:
      "When the job is over you can lock the project or delete it outright, and deleting it removes the files from storage too.",
  },

  privacyBlock: {
    heading: "Who can see the photos",
    body: "You, and whoever has the link plus the PIN if you set one. Galleries do not show up in search engines, there is no public feed and there are no profiles. Photos live in a private bucket with no public address.",
    linkLabel: "Read the full privacy policy (in Spanish)",
    aiNote:
      "The AI analyzes a thumbnail of each photo so it can search and group them. The privacy policy spells out exactly what is sent and where.",
  },

  pricing: {
    eyebrow: "Pricing",
    heading: "Start free",
    intro:
      "Today Festora has a single account type and it is free. Paid plans will be announced here when they exist, and the free account will stay.",
    freePlan: {
      name: "Free account",
      price: "0",
      priceNote: "no card required",
      cta: "Create my account",
      includes: [
        "5 GB of storage",
        "Unlimited projects",
        "Private gallery with a unique link",
        "Optional PIN per project",
        "Client favorites",
        "Bulk download with no size ceiling",
        "Natural-language AI search",
        "AI-suggested albums",
      ],
    },
    soon: {
      name: "Paid plans",
      body: "They are in the works, with more storage and studio features. There is no date and no public price yet, which is why none is listed here.",
    },
    faqLink: "Read the FAQ",
  },

  faq: {
    eyebrow: "FAQ",
    heading: "Frequently asked questions about Festora",
    intro:
      "Short answers to what photographers ask before they deliver their first shoot.",
    items: [
      {
        question: "What is Festora?",
        answer:
          "Festora is a web platform for photo delivery, built for professional photographers. You upload the photos from a shoot and hand them to your client in a private, PIN-protected gallery where they mark favorites and download the originals. Natural-language AI search is included.",
      },
      {
        question: "How do I share photos with my client?",
        answer:
          "You create the project, upload the photos, and Festora generates an eight-character gallery link. Send that link to your client however you like. They do not need to install anything.",
      },
      {
        question: "Does my client need an account?",
        answer:
          "No. The client opens the link and sees the gallery. They are only asked for a PIN if you chose to set one on the project.",
      },
      {
        question: "Can I password-protect a gallery?",
        answer:
          "Yes. Every project supports an optional PIN. The PIN is stored hashed, and once the client enters it correctly their browser remembers the access for seven days.",
      },
      {
        question: "How much does Festora cost?",
        answer:
          "Today there is a free account with 5 GB of storage and unlimited projects, including PIN-protected galleries, client favorites, bulk download and AI search. No card is required. Paid plans are in preparation and have no public price yet.",
      },
      {
        question: "How does the client choose their favorite photos?",
        answer:
          "Inside the gallery the client marks each photo they want. You see that selection in the project dashboard and can download the favorites alone, without cross-checking file names by hand.",
      },
      {
        question: "Can all the photos be downloaded at once?",
        answer:
          "Yes. Both you and your client can download the whole gallery, the favorites, or a single album. The ZIP is assembled in the browser as it downloads, with a progress bar.",
      },
      {
        question: "Is there a size limit on downloads?",
        answer:
          "In practice, no. Because the ZIP is built in the browser rather than on a server, a 5 GB delivery behaves like a small one. In browsers that can write straight to disk it arrives as a single file; elsewhere it is split into 500 MB parts.",
      },
      {
        question: "How does the AI search work?",
        answer:
          "As each photo is uploaded, Festora analyzes it and stores a representation of what it shows. You can then search in plain language, for example the first dance or the details of the bouquet, and the gallery returns the matching photos even though nobody tagged them.",
      },
      {
        question: "Who can see my photos?",
        answer:
          "You and whoever has the link, plus the PIN if you set one. Galleries are not indexed by search engines and photos live in a private bucket with no public address: every image is served through short-lived signed links.",
      },
      {
        question: "What happens if I delete a project?",
        answer:
          "The gallery, its photos, the client's selections and the files in storage are all deleted. The link stops working. There is no trash bin: it is permanent.",
      },
      {
        question: "What languages is Festora available in?",
        answer:
          "This site is available in Spanish and English. The application itself is in Spanish.",
      },
    ],
  },

  finalCta: {
    heading: "Deliver your next shoot in Festora",
    body: "Create an account with your Google address, upload a shoot and see how your client receives it. It costs nothing and asks for no card.",
    cta: "Start free",
  },

  footer: {
    tagline: "Photo delivery for professional photographers.",
    privacy: "Privacy",
    privacyNote: "in Spanish",
    rights: "All rights reserved.",
  },
};
