import { GoogleGenAI, Type } from "@google/genai";
import { AgentService } from "./agentService";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function processDictionaryImage(base64Image: string, mimeType: string, page?: number) {
  const fewShot = AgentService.getFewShotContext();
  
  const prompt = `
    You are an expert reading an 1896 Sgaw Karen-English dictionary.
    ${fewShot}

    CRITICAL LINGUISTIC RULES FOR SGAW KAREN DICTIONARY ORDER:
    Alphabetical order predicts/audits OCR errors.
    Chronological syllable structure:
    1. CONSONANT (Base): (e.g., က, ခ, ဂ...).
    2. MEDIAL(S): None -> Ya (ၠ) -> Ra (ြ) -> La (ျ) -> Wa (ွ) -> Ha/Gha (ှ).
    3. VOWELS: None -> ee (ံ) -> er (ၢ) -> u (ု) -> oo (ူ) -> ay (့) -> eh (ဲ) -> oh (ိ) -> aw (ီ).
    4. TONES/ENDINGS: None -> Ah (ါ) -> Er thee (ၢ်) -> Ah thee (ာ်) -> Pler chee (း) -> Hah () -> Gay poh () -> Keh phoh (ၤ).
    Syllable Formula = [Consonant] + [Medial] + [Vowel] + [Tone].

    Context: Page ${page || 'unknown'}.

    RULES:
    1. Extract every headword as 'karen' and definitions as a list 'definitions'.
    2. Include 'page': ${page || 'unknown'} in each object if known.
    3. Return ONLY a valid JSON array. If blank return [].
    4. BANNED: 'ဏ' does not exist in Sgaw Karen — replace with correct consonant.
    5. BANNED: Burmese 'ေ' does not exist — use '့' instead.
    6. Never drop 'co.' compound entries.
    7. Never split one entry into two mid-definition.
    8. HEADWORD RULE: The 'karen' field must contain ONLY Karen Unicode script characters
    (Unicode range U+1000–U+109F and U+AA60–U+AA7F). If you see English letters,
    numbers, or punctuation in a headword, they do NOT belong there — strip them out
    completely. English belongs only in the 'definitions' list, never in 'karen'.
    9. If a line starts with a number like '1.' or '2.' it is a sub-definition of the
    previous headword — add it to that headword's 'definitions' list, do not make
    it a new entry with a number as the 'karen' field.
    10. If a line starts with 'co.' or 'cf.' it is a compound or cross-ref entry related
    to the previous headword — add it to that headword's 'definitions' list, do not make
    it a new entry with 'co.' as the 'karen' field.
    11. If you are unsure about a character, refer to the cheat sheet and use your best
    judgment to identify the most likely intended Karen character based on the shape and
    context.
    12. If the image is too blurry to read, return an empty array [] rather than guessing.
    13. If you see what looks like a partial headword with missing characters, do not try to
    guess the missing parts — just return the visible characters as the 'karen' field and
    include a 'flag': true field in that entry to flag it for later human review.
    14. ALWAYS preserve ALL sub-entries, compound words, and cross-refs exactly as they appear,
    even if they look incomplete or strange — do NOT try to "clean" or "fix" them, just capture them as they are.
    15. The dictionary is in strict alphabetical order — if you see an entry that seems out of order, it may be an OCR error. Use the alphabetical context to make your best guess at what the correct Karen characters should be, and if you're not sure, flag it for review rather than leaving it blank.
    16. Remember that the left column is Karen script headwords and the right column is English definitions — do not mix them up.
    17. The presence of certain "anchor" characters can help you identify common OCR errors. For example, if you see a headword with the character 'ဏ', it is likely an OCR error for 'န' or 'တ' THIS IS JUST AN EXAMPLE— use the surrounding entries and alphabetical order to determine which one is most likely correct.
    18. Pay close attention to the presence of 'co.' and 'cf.' in the definitions, as they indicate compound entries and cross-references that are very likely to contain the exact same corresponding headword, which can help you identify and correct OCR errors in the headword by providing additional context.
    19. If you identify a likely OCR error in a headword based on the presence of an "anchor" character or the alphabetical context, make your best guess at the correct Karen characters and return the corrected version in the 'karen' field, but also include an 'flag': true field in that entry to flag it for later human review, since OCR errors can be tricky and you want to make sure a human double-checks any corrections you make.
    20. If you see an entry with a headword that contains the exact same "anchor" character or sequence of characters as another entry, and that "anchor" is known to be a common OCR error for a specific Karen character, then it is likely that both entries contain the same OCR error. In this case, you should apply the same correction to both entries to maintain consistency, but also flag both entries for review since you're not 100% sure about the correction.
    21. Always use the alphabetical order of the dictionary to inform your decisions about what the correct Karen characters should be, since entries are arranged in strict alphabetical order and this can provide crucial context for identifying and correcting OCR errors.
    22. If you identify an OCR error in a headword and correct it, you should also scan the rest of the dictionary for any other entries that contain the same "anchor" character or sequence of characters that led you to identify the OCR error in the first place, since it's likely that any entry containing that same "anchor" is affected by the same OCR error and should be corrected in the same way to maintain consistency across the dictionary.
    23. There are some characters that are commonly misread by OCR but do not actually exist in Sgaw Karen, such as 'ဏ' and the Burmese vowel 'ေ'. If you see these characters in a headword, it is a strong signal that there is an OCR error, and you should use the surrounding entries and alphabetical context to make your best guess at what the correct Karen character should be, and if you're not sure, flag it for review rather than leaving it blank.
    24. Remember that your goal is to extract the headwords and definitions as accurately as possible, but also to use the context of the dictionary's alphabetical order and the presence of "anchor" characters to identify and correct OCR errors in a consistent way, while flagging any uncertain cases for later human review rather than leaving them blank.
    25. Always return a valid JSON array, even if it's empty, and do not include any extra text or formatting outside of the JSON array in your response.
    26. Map the Json array based on page number and row number first, but after sorting that way, the next sub-sorting criteria should be based on the chronological order you input the entries.
    27. If you identify an OCR error in a headword and correct it, you should also include a 'reason' field or similar description in the 'definitions' so human reviewers can easily see what happened.
    28. If you identify an OCR error in a headword and correct it, you should also include the original incorrect version of the headword in a 'original_karen' field in the entry.
    29. Add a "status" field indicating your confidence: "correct" (I am sure this is right), "needs_correction" (I think errors are present / translation wasn't right), "unsure" (I really don't know).
    30. If a definition has grammar explanations, then use that as context for future and revisional corrections.
    31. If "as," appears in the definition, this is an example sentence that you can use for later. Put it in a separate 'example_sentence' field.
    32. The english words directly following the karen example sentence (which is usually introduced with "as,") are the translation of that example sentence, so make sure to capture those english words in the 'definitions' list as well.
    33. Even though the example sentences are in the definitions, you should still capture the example sentence in a separate 'example_sentence' field in the entry.
    34. Also capture the example sentence in a new headword entry with the 'karen' field set to the example sentence itself, and include a '_is_example_sentence': true field in that entry.
    35. If an example sentence is being captured as a separate headword entry, make sure to also include the English translation of that example sentence in the 'definitions' list of that entry, and keep it in alphabetical order with the other headwords.
    36. If you identify an OCR error in a headword and correct it, you should also check to see if there are any example sentences associated with that headword to correct.
    37. If you can identify the grammatical role of the headword, you should also include a 'part_of_speech' field.
    38. If a certain headword is noted in the definition to be interchangeable with another headword, you should also include an 'interchangeable_with' field.
    39. Interchangeable headwords should be predicted when they are about to happen because you have been instructed to expect alphabetical ordering.
    40. If a "see" in italicized text appears in the definition, the karen text that directly follows it is a guaranteed correct headword.
    41. Cross-reference entries are guaranteed to be headwords in the dictionary somewhere.
    42. Since the Karen language has many instances of repeated headwords making up one headword or a co. compound entry, if you see repeated headwords or headwords that are very similar to each other in the same entry, it is likely intentional.
    43. Headwords that are compounded two times to make a compound may or may not be a headword, but are generally intentional.
    44. If a entry definition contains a "from" followed by a karen text, this is likely to be an etymological note indicating the origin. capture this in an 'etymology' field.
    45. If a entry definition contains a "do." in italicized text, this is likely a ditto mark indicating that the headword is the same as the previous headword. Capture this in a 'ditto_of' field.
    46. If an entry definition contains a "&c." or "etc." in italicized text, this is likely to indicate that there are additional related headwords. Capture in a 'related_headwords' field.
    47. If an entry definition contains a "co." followed by a Karen text, this is likely a compound entry. Capture in a 'compound_entry' field.
    48. If an entry definition contains a "cf." followed by a Karen text, this is likely a cross-reference. Capture in a 'cross_reference' field.
    
    Return ONLY the JSON matching the schema precisely.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          entries: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                karen: { type: Type.STRING },
                definitions: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING } 
                },
                page: { type: Type.NUMBER },
                flag: { type: Type.BOOLEAN },
                status: { type: Type.STRING },
                _is_example_sentence: { type: Type.BOOLEAN },
                example_sentence: { type: Type.STRING },
                original_karen: { type: Type.STRING },
                part_of_speech: { type: Type.STRING },
                interchangeable_with: { type: Type.ARRAY, items: { type: Type.STRING } },
                etymology: { type: Type.STRING },
                ditto_of: { type: Type.STRING },
                related_headwords: { type: Type.ARRAY, items: { type: Type.STRING } },
                compound_entry: { type: Type.STRING },
                cross_reference: { type: Type.STRING }
              },
              required: ["karen", "definitions", "status"]
            }
          }
        },
        required: ["entries"]
      }
    }
  });

  return JSON.parse(response.text);
}
