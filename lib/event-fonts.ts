import { DM_Serif_Display, Fraunces, Playfair_Display } from 'next/font/google';

// Optional heading fonts for event pages (Cormorant is loaded site-wide by the root layout).
// preload:false — a font file only downloads on pages whose theme actually uses it.
const playfair = Playfair_Display({ variable: '--font-playfair', subsets: ['latin'], preload: false });
const dmSerif = DM_Serif_Display({ variable: '--font-dmserif', subsets: ['latin'], weight: '400', preload: false });
const fraunces = Fraunces({ variable: '--font-fraunces', subsets: ['latin'], preload: false });

/** Class names that define the --font-* variables the event themes refer to. */
export const eventFontVariables = `${playfair.variable} ${dmSerif.variable} ${fraunces.variable}`;
