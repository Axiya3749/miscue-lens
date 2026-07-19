export interface Passage {
  id: string;
  title: string;
  text: string;
}

// Small fixed set for demo reliability. Each passage is ~5 sentences and
// includes a mix of regular and irregularly-spelled words so interference
// and inconsistent patterns are easy to inspect during self-testing.
export const PASSAGES: Passage[] = [
  {
    id: "park",
    title: "A Trip to the Park",
    text: "Maya walked to the park with her dog. The sun was bright, and the grass felt soft under her shoes. She sat on a bench and watched two squirrels climb a tall tree. A friend waved from across the field. Maya smiled and waved back before walking home."
  },
  {
    id: "lost-key",
    title: "The Lost Key",
    text: "Sam could not find his house key. He looked under the mat and behind the plant. His sister said the key might be in his coat pocket. Sam checked and found it right away. He laughed and said he should have looked there first."
  },
  {
    id: "mooncakes",
    title: "Mooncakes for the Festival",
    text: "Every autumn, Lily's grandmother makes mooncakes at home. The kitchen smells sweet, and the family gathers around the table. Lily helps roll the dough into small round balls. Her grandmother tells old stories about the moon. At night, they sit outside and watch the bright full moon together."
  },
  {
    id: "bicycle",
    title: "Learning to Ride",
    text: "Wei got a new bicycle for his birthday. His father held the seat while Wei pushed the pedals. At first, the bike wobbled and Wei almost fell. After a few tries, he found his balance and rode down the street. Wei felt proud and could not wait to ride again tomorrow."
  }
];
