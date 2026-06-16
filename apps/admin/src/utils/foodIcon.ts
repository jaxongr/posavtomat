// Pick a matching emoji for a product by its name (Uzbek/Russian keywords),
// falling back to a sensible icon per product type. Pure, no dependencies —
// used in the restaurant menu and catalog so dishes show a visual cue.

type ProductType = 'GOODS' | 'DISH' | 'INGREDIENT';

// Keyword → emoji. Order matters: first match wins, so put specific words first.
const KEYWORD_ICONS: ReadonlyArray<[RegExp, string]> = [
  [/osh|palov|plov/i, '🍚'],
  [/lag('|‘|`)?mon|lagman|sho('|‘|`)?rva|shorva|sho(r)?po|mastava/i, '🍜'],
  [/manti|chuchvara|pelmen|dumpling/i, '🥟'],
  [/somsa|samsa/i, '🥧'],
  [/kabob|kebab|shashlik|shahslik|jaz/i, '🍢'],
  [/burger|gamburger/i, '🍔'],
  [/pizza|pitsa/i, '🍕'],
  [/hotdog|hot.?dog|sosiska/i, '🌭'],
  [/lavash|shaurma|shawarma|donar|do('|‘|`)?ner/i, '🌯'],
  [/salat|salad/i, '🥗'],
  [/non|lepyoshka|patir|bread/i, '🍞'],
  [/tuxum|egg|omlet/i, '🍳'],
  [/baliq|fish|fore(l)?/i, '🐟'],
  [/tovuq|kuritsa|chicken|qovurma/i, '🍗'],
  [/go('|‘|`)?sht|myaso|meat|biftek|steak|antrekot/i, '🥩'],
  [/guruch|ris|rice/i, '🍚'],
  [/kartoshka|kartofel|fri|potato/i, '🍟'],
  [/makaron|pasta|spagetti/i, '🍝'],
  [/sendvich|sandwich|buterbrod/i, '🥪'],
  [/sup|sho('|‘|`)?rva|borsh/i, '🍲'],
  [/choy|chay|tea/i, '🍵'],
  [/kofe|kahva|coffee|kapuchino|kapuchcino|latte|espresso/i, '☕'],
  [/kola|cola|fanta|sprite|gazli|limonad|napit|ichimlik|sok|juice|kompot|mors/i, '🥤'],
  [/suv|voda|water/i, '💧'],
  [/sut|moloko|milk|kefir|qatiq|yogurt/i, '🥛'],
  [/pivo|beer/i, '🍺'],
  [/vino|wine|konyak|aroq|vodka|viski|spirt/i, '🍷'],
  [/tort|kek|cake|pirojn|desert|dessert|shirin|halva|chak.?chak/i, '🍰'],
  [/muzqaymoq|morojen|ice.?cream/i, '🍦'],
  [/shokolad|chocolate|konfet|candy/i, '🍫'],
  [/meva|fruit|olma|apple|banan|uzum|grape/i, '🍎'],
  [/sabzavot|sabzi|vegetable|piyoz|pomidor|bodring|sarimsoq|garlic/i, '🥕'],
  [/yog('|‘|`)?|maslo|moy|oil/i, '🧈'],
  [/tuz|sol|salt|ziravor|spice|murch|pepper/i, '🧂'],
];

const TYPE_FALLBACK: Record<ProductType, string> = {
  DISH: '🍽️',
  INGREDIENT: '🥕',
  GOODS: '📦',
};

export function foodIcon(name: string, type: ProductType = 'GOODS'): string {
  const n = name ?? '';
  for (const [re, icon] of KEYWORD_ICONS) {
    if (re.test(n)) {
      return icon;
    }
  }
  return TYPE_FALLBACK[type] ?? '📦';
}
