// Translations for strings the ENGINE produces.
// The engine emits { key, params } — never prose — so every recommendation
// renders fully in the farmer's language, not just the interface chrome.

const NUT = {
  en: { N: 'nitrogen', P: 'phosphorus', K: 'potassium', S: 'sulphur', Zn: 'zinc' },
  hi: { N: 'नाइट्रोजन', P: 'फॉस्फोरस', K: 'पोटाश', S: 'सल्फर', Zn: 'जिंक' },
  gu: { N: 'નાઇટ્રોજન', P: 'ફોસ્ફરસ', K: 'પોટાશ', S: 'સલ્ફર', Zn: 'ઝીંક' },
};

const CLASS = {
  en: { Low: 'Low', Medium: 'Medium', High: 'High' },
  hi: { Low: 'कम', Medium: 'मध्यम', High: 'अधिक' },
  gu: { Low: 'ઓછું', Medium: 'મધ્યમ', High: 'વધુ' },
};

const E = {
  en: {
    zeroDose: (p, n, c) => `Your soil already carries ${p.value} kg/ha of ${n} — the ${c} class. Nothing more is needed here, and that is money you keep.`,
    zeroMicro: (p, n) => `Soil ${n} sits at ${p.value} ppm, above the ${p.limit} ppm critical limit. Nothing more is needed.`,

    warnNoS: () => "Sulphur was not tested. India's Soil Health Card survey finds sulphur deficiency common in oilseed-growing soils — worth testing before the next season.",
    warnNoZn: () => "Zinc was not tested. India's Soil Health Card survey finds zinc deficiency widespread — worth testing before the next season.",
    warnSodic: (p) => `Soil pH ${p.ph} is strongly alkaline. DAP works poorly here — SSP and ammonium sulphate are the better sources.`,
    warnAlkaline: (p) => `Soil pH ${p.ph} is alkaline. Urea left on the surface loses nitrogen faster here — mix it into the soil.`,
    warnAcidic: (p) => `Soil pH ${p.ph} is acidic. Phosphorus gets locked up and the crop cannot reach it.`,
    warnEcHigh: (p) => `Salinity (EC ${p.ec} dS/m) is in the harmful range. Split every dose and avoid applying MOP all at once.`,
    warnEcMid: (p) => `Salinity (EC ${p.ec} dS/m) is borderline. Splitting the dose is safer.`,

    amendGypsum: () => 'Reclaims alkaline soil and supplies sulphur',
    amendLime: () => 'Raises pH so phosphorus stays available',

    whySspS: () => 'Supplies phosphorus and the missing sulphur in one bag',
    whySspAlk: () => 'A better phosphorus source than DAP on alkaline soil',
    whyDap: () => 'Meets the remaining phosphorus requirement',
    whyAmmSulph: () => 'Supplies sulphur and part of the nitrogen',
    whyBentSulph: () => 'Corrects the remaining sulphur shortage',
    whyUrea: () => 'Meets the nitrogen still needed after the DAP',
    whyMop: () => 'Meets the potassium requirement',
    whyZinc: () => 'Corrects the zinc shortage',

    ruleR1: () => 'Heavy rain is coming',
    ruleR1msg: (p) => `${p.rain} mm of rain is expected within 24 hours. Fertilizer applied now will wash off the field before the crop can use it.`,
    ruleR2: () => 'This is the best window this week',
    ruleR2msg: (p) => `Light rain (${p.rain} mm) is expected in the next 6 to 24 hours. It will carry the urea down into the soil instead of letting it escape into the air — the best conditions you will get this week.`,
    ruleR3: () => 'Nitrogen will escape into the air',
    ruleR3msg: (p) => `No rain for ${p.hours} hours, ${p.temp}°C, and your soil is alkaline. Urea left on the surface turns to gas. Working it into the soil, or a light irrigation straight after, keeps most of it in the field.`,
    ruleR4: () => 'Too windy to spread evenly',
    ruleR4msg: (p) => `Wind up to ${p.wind} km/h today. Granules will land unevenly. A calm morning would spread far more evenly.`,
    ruleR5: () => 'The field is waterlogged',
    ruleR5msg: () => 'Nitrogen applied to a waterlogged field is lost as gas within days. Once the water drains, it will hold.',
    ruleR6: () => 'Too cold for the roots to take it up',
    ruleR6msg: (p) => `Temperature drops to ${p.temp}°C. Roots absorb very little below ${p.limit}°C. A few days' wait, or a smaller amount, would go further.`,
    ruleR7: () => 'Sandy soil will let nitrogen drain away',
    ruleR7msg: (p) => `${p.rain} mm expected over two days on sandy soil. Nitrogen will drain below the roots. Half now and the rest after the rain would hold much better.`,
    ruleR8: () => 'Afternoon heat works against you',
    ruleR8msg: (p) => `${p.temp}°C with dry air. Early morning or evening holds far better than midday.`,

    overrideCritical: () => 'This one is worth not missing',
    overrideCriticalmsg: () => 'The crop is at a stage where it cannot wait. Going ahead today and working the fertilizer straight into the soil loses the least.',

    mechRunoff: () => 'Surface runoff and nitrate leaching',
    mechIncorp: () => 'Rain washes the urea in, reducing ammonia loss',
    mechVolat: () => 'Ammonia volatilization',
    mechUneven: () => 'Uneven application',
    mechDenitr: () => 'Denitrification',
    mechUptake: () => 'Reduced root uptake',
    mechLeach: () => 'Nitrate leaching',

    tierALabel: (p) => `STCR-calibrated for ${p.zone}`,
    tierBLabel: () => 'ICAR general recommendation — not zone-calibrated',
    clear: () => 'Nothing in the forecast argues against going ahead today.',
  },

  hi: {
    zeroDose: (p, n, c) => `आपकी मिट्टी में पहले से ${p.value} किलो/हे. ${n} है — यह ${c} श्रेणी है। यहाँ और की ज़रूरत नहीं, यह पैसा आपका बचा।`,
    zeroMicro: (p, n) => `मिट्टी में ${n} ${p.value} पीपीएम है, जो ${p.limit} पीपीएम की सीमा से ऊपर है। और की ज़रूरत नहीं।`,

    warnNoS: () => 'सल्फर की जाँच नहीं हुई। भारत के मृदा स्वास्थ्य कार्ड सर्वेक्षण के अनुसार तिलहन क्षेत्रों की मिट्टी में सल्फर की कमी आम है — अगले सीज़न से पहले जाँच कराएँ।',
    warnNoZn: () => 'जिंक की जाँच नहीं हुई। भारत के मृदा स्वास्थ्य कार्ड सर्वेक्षण के अनुसार जिंक की कमी व्यापक है — अगले सीज़न से पहले जाँच कराएँ।',
    warnSodic: (p) => `मिट्टी का पी.एच. ${p.ph} बहुत क्षारीय है। यहाँ डीएपी ठीक काम नहीं करता — एसएसपी और अमोनियम सल्फेट बेहतर हैं।`,
    warnAlkaline: (p) => `मिट्टी का पी.एच. ${p.ph} क्षारीय है। ऊपर पड़ा यूरिया यहाँ जल्दी उड़ता है — इसे मिट्टी में मिलाएँ।`,
    warnAcidic: (p) => `मिट्टी का पी.एच. ${p.ph} अम्लीय है। फॉस्फोरस बँध जाता है और फसल तक नहीं पहुँचता।`,
    warnEcHigh: (p) => `लवणता (ईसी ${p.ec}) हानिकारक स्तर पर है। हर खुराक बाँटें और पोटाश एक साथ न डालें।`,
    warnEcMid: (p) => `लवणता (ईसी ${p.ec}) सीमा पर है। खुराक बाँटना सुरक्षित रहेगा।`,

    amendGypsum: () => 'क्षारीय मिट्टी सुधारता है और सल्फर देता है',
    amendLime: () => 'पी.एच. बढ़ाता है ताकि फॉस्फोरस उपलब्ध रहे',

    whySspS: () => 'एक ही बोरी में फॉस्फोरस और कमी वाला सल्फर देता है',
    whySspAlk: () => 'क्षारीय मिट्टी में डीएपी से बेहतर फॉस्फोरस स्रोत',
    whyDap: () => 'बची हुई फॉस्फोरस की ज़रूरत पूरी करता है',
    whyAmmSulph: () => 'सल्फर और कुछ नाइट्रोजन देता है',
    whyBentSulph: () => 'बची हुई सल्फर की कमी पूरी करता है',
    whyUrea: () => 'डीएपी के बाद बची नाइट्रोजन पूरी करता है',
    whyMop: () => 'पोटाश की ज़रूरत पूरी करता है',
    whyZinc: () => 'जिंक की कमी पूरी करता है',

    ruleR1: () => 'तेज़ बारिश आ रही है',
    ruleR1msg: (p) => `अगले 24 घंटों में ${p.rain} मिमी बारिश का अनुमान है। अभी डाली खाद फसल के काम आने से पहले बह जाएगी।`,
    ruleR2: () => 'इस सप्ताह का सबसे अच्छा समय यही है',
    ruleR2msg: (p) => `अगले 6 से 24 घंटों में हल्की बारिश (${p.rain} मिमी) आने वाली है। यह यूरिया को मिट्टी में उतार देगी, हवा में उड़ने नहीं देगी — इस सप्ताह इससे बेहतर मौका नहीं मिलेगा।`,
    ruleR3: () => 'नाइट्रोजन हवा में उड़ जाएगी',
    ruleR3msg: (p) => `${p.hours} घंटे से बारिश नहीं, ${p.temp}°C तापमान, और मिट्टी क्षारीय है। ऊपर पड़ा यूरिया गैस बनकर उड़ जाता है। मिट्टी में मिला देने से, या तुरंत हल्की सिंचाई से, अधिकांश खेत में ही रह जाता है।`,
    ruleR4: () => 'हवा तेज़ है, समान छिड़काव नहीं होगा',
    ruleR4msg: (p) => `आज ${p.wind} किमी/घंटा तक हवा है। दाने असमान गिरेंगे। शांत सुबह में कहीं बेहतर फैलाव होगा।`,
    ruleR5: () => 'खेत में पानी भरा है',
    ruleR5msg: () => 'पानी भरे खेत में डाली नाइट्रोजन कुछ ही दिनों में गैस बनकर उड़ जाती है। पानी निकलने के बाद यह टिकेगी।',
    ruleR6: () => 'जड़ों के लिए बहुत ठंड है',
    ruleR6msg: (p) => `तापमान ${p.temp}°C तक गिरता है। ${p.limit}°C से नीचे जड़ें बहुत कम सोखती हैं। कुछ दिन बाद, या कम मात्रा में, ज़्यादा काम आएगी।`,
    ruleR7: () => 'रेतीली मिट्टी नाइट्रोजन को नीचे बहा देगी',
    ruleR7msg: (p) => `रेतीली मिट्टी पर दो दिन में ${p.rain} मिमी बारिश का अनुमान है। नाइट्रोजन जड़ों से नीचे चली जाएगी। आधी अभी और बाकी बारिश के बाद देने से कहीं बेहतर टिकेगी।`,
    ruleR8: () => 'दोपहर की गर्मी नुकसान करती है',
    ruleR8msg: (p) => `${p.temp}°C और सूखी हवा। सुबह जल्दी या शाम को कहीं बेहतर टिकती है।`,

    overrideCritical: () => 'यह खुराक छोड़ने लायक नहीं',
    overrideCriticalmsg: () => 'फसल ऐसी अवस्था में है कि रुक नहीं सकती। आज देकर तुरंत मिट्टी में मिला देने से सबसे कम बर्बाद होती है।',

    mechRunoff: () => 'बहाव और नाइट्रेट का रिसाव',
    mechIncorp: () => 'बारिश यूरिया को मिट्टी में उतारती है',
    mechVolat: () => 'अमोनिया बनकर उड़ना',
    mechUneven: () => 'असमान छिड़काव',
    mechDenitr: () => 'नाइट्रोजन का गैस बनना',
    mechUptake: () => 'जड़ों का कम सोखना',
    mechLeach: () => 'नाइट्रेट का रिसाव',

    tierALabel: (p) => `${p.zone} के लिए एसटीसीआर आधारित`,
    tierBLabel: () => 'आईसीएआर सामान्य सिफ़ारिश — क्षेत्र-कैलिब्रेटेड नहीं',
    clear: () => 'परिस्थिति अच्छी है। पूर्वानुमान में आज डालने के विरुद्ध कुछ नहीं है।',
  },

  gu: {
    zeroDose: (p, n, c) => `તમારી જમીનમાં પહેલેથી ${p.value} કિલો/હે. ${n} છે — આ ${c} શ્રેણી છે. અહીં વધુની જરૂર નથી, આ પૈસા તમારા બચ્યા.`,
    zeroMicro: (p, n) => `જમીનમાં ${n} ${p.value} પીપીએમ છે, જે ${p.limit} પીપીએમની મર્યાદાથી ઉપર છે. વધુની જરૂર નથી.`,

    warnNoS: () => 'સલ્ફરની ચકાસણી થઈ નથી. ભારતના મૃદા આરોગ્ય કાર્ડ સર્વે મુજબ તેલીબિયાં વિસ્તારોની જમીનમાં સલ્ફરની ખોટ સામાન્ય છે — આવતી સીઝન પહેલાં ચકાસણી કરાવો.',
    warnNoZn: () => 'ઝીંકની ચકાસણી થઈ નથી. ભારતના મૃદા આરોગ્ય કાર્ડ સર્વે મુજબ ઝીંકની ખોટ વ્યાપક છે — આવતી સીઝન પહેલાં ચકાસણી કરાવો.',
    warnSodic: (p) => `જમીનનો પી.એચ. ${p.ph} ખૂબ ક્ષારીય છે. અહીં ડીએપી બરાબર કામ કરતું નથી — એસએસપી અને એમોનિયમ સલ્ફેટ વધુ સારાં છે.`,
    warnAlkaline: (p) => `જમીનનો પી.એચ. ${p.ph} ક્ષારીય છે. ઉપર પડેલું યુરિયા અહીં ઝડપથી ઊડે છે — તેને જમીનમાં ભેળવો.`,
    warnAcidic: (p) => `જમીનનો પી.એચ. ${p.ph} એસિડિક છે. ફોસ્ફરસ બંધાઈ જાય છે અને પાક સુધી પહોંચતું નથી.`,
    warnEcHigh: (p) => `ક્ષારતા (ઈસી ${p.ec}) નુકસાનકારક સ્તરે છે. દરેક માત્રા વહેંચો અને પોટાશ એકસાથે ન નાખો.`,
    warnEcMid: (p) => `ક્ષારતા (ઈસી ${p.ec}) સીમા પર છે. માત્રા વહેંચવી સલામત રહેશે.`,

    amendGypsum: () => 'ક્ષારીય જમીન સુધારે છે અને સલ્ફર આપે છે',
    amendLime: () => 'પી.એચ. વધારે છે જેથી ફોસ્ફરસ ઉપલબ્ધ રહે',

    whySspS: () => 'એક જ થેલીમાં ફોસ્ફરસ અને ખૂટતું સલ્ફર આપે છે',
    whySspAlk: () => 'ક્ષારીય જમીનમાં ડીએપી કરતાં સારો ફોસ્ફરસ સ્રોત',
    whyDap: () => 'બાકીની ફોસ્ફરસ જરૂરિયાત પૂરી કરે છે',
    whyAmmSulph: () => 'સલ્ફર અને થોડું નાઇટ્રોજન આપે છે',
    whyBentSulph: () => 'બાકીની સલ્ફર ખોટ પૂરી કરે છે',
    whyUrea: () => 'ડીએપી પછી બાકી રહેલું નાઇટ્રોજન પૂરું કરે છે',
    whyMop: () => 'પોટાશની જરૂરિયાત પૂરી કરે છે',
    whyZinc: () => 'ઝીંકની ખોટ પૂરી કરે છે',

    ruleR1: () => 'ભારે વરસાદ આવી રહ્યો છે',
    ruleR1msg: (p) => `આગામી 24 કલાકમાં ${p.rain} મિમી વરસાદની આગાહી છે. અત્યારે નાખેલું ખાતર પાકને કામ લાગે તે પહેલાં વહી જશે.`,
    ruleR2: () => 'આ અઠવાડિયાનો શ્રેષ્ઠ સમય આ જ છે',
    ruleR2msg: (p) => `આગામી 6 થી 24 કલાકમાં હળવો વરસાદ (${p.rain} મિમી) આવવાનો છે. તે યુરિયાને જમીનમાં ઉતારશે, હવામાં ઊડવા નહીં દે — આ અઠવાડિયે આનાથી સારી તક નહીં મળે.`,
    ruleR3: () => 'નાઇટ્રોજન હવામાં ઊડી જશે',
    ruleR3msg: (p) => `${p.hours} કલાકથી વરસાદ નથી, ${p.temp}°C તાપમાન, અને જમીન ક્ષારીય છે. ઉપર પડેલું યુરિયા વાયુ બનીને ઊડી જાય છે. જમીનમાં ભેળવવાથી, કે તરત હળવા પિયતથી, મોટા ભાગનું ખેતરમાં જ રહે છે.`,
    ruleR4: () => 'પવન વધુ છે, સરખું છંટાશે નહીં',
    ruleR4msg: (p) => `આજે ${p.wind} કિમી/કલાક સુધી પવન છે. દાણા અસમાન પડશે. શાંત સવારે ઘણો સારો ફેલાવો થશે.`,
    ruleR5: () => 'ખેતરમાં પાણી ભરાયેલું છે',
    ruleR5msg: () => 'પાણી ભરાયેલા ખેતરમાં નાખેલું નાઇટ્રોજન થોડા દિવસમાં વાયુ બનીને ઊડી જાય છે. પાણી ઉતર્યા પછી તે ટકશે.',
    ruleR6: () => 'મૂળ માટે ખૂબ ઠંડી છે',
    ruleR6msg: (p) => `તાપમાન ${p.temp}°C સુધી ઘટે છે. ${p.limit}°C થી નીચે મૂળ બહુ ઓછું શોષે છે. થોડા દિવસ પછી, કે ઓછી માત્રામાં, વધુ કામ લાગશે.`,
    ruleR7: () => 'રેતાળ જમીન નાઇટ્રોજનને નીચે ઉતારી દેશે',
    ruleR7msg: (p) => `રેતાળ જમીન પર બે દિવસમાં ${p.rain} મિમી વરસાદની આગાહી છે. નાઇટ્રોજન મૂળથી નીચે ઉતરી જશે. અડધું અત્યારે અને બાકી વરસાદ પછી આપવાથી ઘણું સારું ટકશે.`,
    ruleR8: () => 'બપોરની ગરમી નુકસાન કરે છે',
    ruleR8msg: (p) => `${p.temp}°C અને સૂકી હવા. વહેલી સવારે કે સાંજે ઘણું સારું ટકે છે.`,

    overrideCritical: () => 'આ માત્રા છોડવા જેવી નથી',
    overrideCriticalmsg: () => 'પાક એવી અવસ્થામાં છે કે રાહ જોઈ શકાય નહીં. આજે આપીને તરત જમીનમાં ભેળવવાથી સૌથી ઓછું વેડફાય છે.',

    mechRunoff: () => 'વહી જવું અને નાઇટ્રેટનું ઊંડે ઉતરવું',
    mechIncorp: () => 'વરસાદ યુરિયાને જમીનમાં ઉતારે છે',
    mechVolat: () => 'એમોનિયા બનીને ઊડવું',
    mechUneven: () => 'અસમાન છંટકાવ',
    mechDenitr: () => 'નાઇટ્રોજનનું વાયુ બનવું',
    mechUptake: () => 'મૂળનું ઓછું શોષણ',
    mechLeach: () => 'નાઇટ્રેટનું ઊંડે ઉતરવું',

    tierALabel: (p) => `${p.zone} માટે એસટીસીઆર આધારિત`,
    tierBLabel: () => 'આઈસીએઆર સામાન્ય ભલામણ — વિસ્તાર-કેલિબ્રેટેડ નથી',
    clear: () => 'પરિસ્થિતિ સારી છે. આગાહીમાં આજે નાખવા સામે કંઈ નથી.',
  },
};

/**
 * Render an engine-emitted { key, params } object in the chosen language.
 * Falls back to English, then to any plain `text` the engine supplied.
 */
export function renderEngine(obj, lang = 'en', suffix = '') {
  if (obj == null) return '';
  if (typeof obj === 'string') return obj;

  const key = (obj.key || obj.whyKey || obj.mechKey || '') + suffix;
  const params = obj.params || {};
  const fn = E[lang]?.[key] || E.en[key];
  if (!fn) return obj.text || obj.message || obj.title || '';

  const nutrient = params.nutrient ? (NUT[lang]?.[params.nutrient] || NUT.en[params.nutrient]) : '';
  const cls = params.class ? (CLASS[lang]?.[params.class] || CLASS.en[params.class]) : '';
  return fn(params, nutrient, cls);
}

export const engineText = (lang, key, params = {}) => {
  const fn = E[lang]?.[key] || E.en[key];
  return fn ? fn(params) : '';
};

export default E;
