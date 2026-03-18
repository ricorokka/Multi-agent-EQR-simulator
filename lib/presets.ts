// lib/presets.ts
import type { Lang } from './types'

export interface Preset {
  label: string
  value: string
}

export const PRESETS: Record<Lang, Preset[]> = {
  en: [
    { label: 'China lifts restrictions', value: 'China lifts all tungsten export restrictions. APT could drop significantly from current $2,500/mtu.' },
    { label: 'APT → $4,000', value: 'APT surges to $4,000/mtu due to further geopolitical escalation and supply tightness.' },
    { label: 'Almonty delays', value: 'Almonty announces 18+ month delays at Sangdong mine, removing key future supply.' },
    { label: 'Iolanthe delayed', value: 'EQR delays Iolanthe Vein access by 12+ months due to unexpected ground conditions.' },
    { label: 'Project Vault $5B', value: 'US Project Vault: government commits $5B to tungsten strategic stockpiling, preferring non-Chinese sources.' },
    { label: 'Full run-rate early', value: 'EQR achieves full targeted production run-rate of >3,350 tpa ahead of schedule.' },
    { label: 'Financial crisis', value: 'Financial crisis: equities -40%, liquidity evaporates, correlations go to 1.' },
  ],
  fi: [
    { label: 'Kiina vapauttaa', value: 'Kiina vapauttaa kaikki wolframin vientirajoitukset. APT voi laskea merkittävästi nykyisestä 2 500 $/mtu:sta.' },
    { label: 'APT → $4 000', value: 'APT nousee 4 000 $/mtu:hun geopoliittisten jännitteiden ja tarjonnan kiristymisen vuoksi.' },
    { label: 'Almonty viivästyy', value: 'Almonty ilmoittaa yli 18 kk viivästyksistä Sangdongin kaivoksella, poistaen merkittävää tulevaa tarjontaa.' },
    { label: 'Iolanthe viivästyy', value: 'EQR viivästyttää Iolanthe Vein -suonet avaamista yli 12 kk odottamattomien maasto-olosuhteiden vuoksi.' },
    { label: 'Project Vault $5mrd', value: 'US Project Vault: hallitus sitoutuu $5mrd wolframin strategiseen varastointiin, suosien ei-kiinalaisia lähteitä.' },
    { label: 'Täysi kapasiteetti etuajassa', value: 'EQR saavuttaa täyden tuotantotavoitteen >3 350 tpa etuajassa.' },
    { label: 'Finanssikriisi', value: 'Finanssikriisi: osakkeet -40%, likviditeetti katoaa, korrelaatiot menevät yhteen.' },
  ],
}
