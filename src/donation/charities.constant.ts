/**
 * Hardcoded charity-картки для donate flow.
 *
 * ⚠️  WALLETS НИЖЧЕ — PLACEHOLDER!  ⚠️
 * Замінити на справжні Solana wallet'и (mainnet) благодійних організацій
 * перед демо. Зараз стоїть твоя merchant-адреса як заглушка, щоб не
 * губити кошти при тестових донатах.
 */

export interface CharityCard {
  id: string;
  type: 'BAC';
  companyName: string;
  contactPerson: string;
  slogan: string;
  donationWallet: string;
  /** URL логотипу організації (можна Cloudinary / GitHub raw / etc.) */
  logoUrl: string;
  /** Hex колір для card background */
  cardColor: string;
  /** Короткий опис місії — показуємо на CardDetail */
  description: string;
  isCharity: true;
}

export const CHARITY_CARDS: CharityCard[] = [
  {
    id: 'charity-cba',
    type: 'BAC',
    companyName: 'Come Back Alive',
    contactPerson: 'Taras Chmut',
    slogan: 'Supporting the Armed Forces of Ukraine',
    donationWallet: '8qBxGn9VC3gvFZc6j4w6jD5GEAbGxhzmPd9zci2pnpDU', // TODO: real CBA wallet
    logoUrl: 'https://savelife.in.ua/wp-content/themes/savelife/assets/img/logo.svg',
    cardColor: '#1A2332',
    description:
      'Largest non-government organization in Ukraine that supports the Armed Forces with non-lethal equipment, training and medical aid.',
    isCharity: true,
  },
  {
    id: 'charity-unicef-ua',
    type: 'BAC',
    companyName: 'UNICEF Ukraine',
    contactPerson: 'Murat Sahin',
    slogan: 'For every child, hope',
    donationWallet: '8qBxGn9VC3gvFZc6j4w6jD5GEAbGxhzmPd9zci2pnpDU', // TODO: real UNICEF wallet
    logoUrl: 'https://www.unicef.org/sites/default/files/styles/logo/public/UNICEF_ForEveryChild_Cyan_Vertical_RGB_72.png',
    cardColor: '#1CABE2',
    description:
      'Working to protect Ukrainian children affected by war — providing safe water, education, mental health support and emergency aid.',
    isCharity: true,
  },
  {
    id: 'charity-prytula',
    type: 'BAC',
    companyName: 'Serhiy Prytula Foundation',
    contactPerson: 'Serhiy Prytula',
    slogan: 'People helping people',
    donationWallet: '8qBxGn9VC3gvFZc6j4w6jD5GEAbGxhzmPd9zci2pnpDU', // TODO: real Prytula wallet
    logoUrl: 'https://prytulafoundation.org/static/img/logo.svg',
    cardColor: '#FFD700',
    description:
      'Charitable foundation focused on military, humanitarian and demining projects. From drones to ambulances — equipping those who defend Ukraine.',
    isCharity: true,
  },
  {
    id: 'charity-unbroken',
    type: 'BAC',
    companyName: 'UNBROKEN Ukraine',
    contactPerson: 'Andriy Sadovyi',
    slogan: 'Rehabilitation and prosthetics for civilians and soldiers',
    donationWallet: '8qBxGn9VC3gvFZc6j4w6jD5GEAbGxhzmPd9zci2pnpDU', // TODO: real UNBROKEN wallet
    logoUrl: 'https://unbroken.org.ua/static/images/logo.svg',
    cardColor: '#2E7D32',
    description:
      'National rehabilitation center in Lviv providing prosthetics, reconstructive surgery and psychological support to those wounded in the war.',
    isCharity: true,
  },
];
