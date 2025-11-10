import { PlayerUpdate, WellnessScore } from "./types";

export const placeholderWellnessScores: WellnessScore[] = [
    {
        id: "placeholder-1",
        date: new Date().toISOString().split("T")[0],
        mood: 4,
        stress: 2,
        sleep: 5,
        motivation: 5,
        rest: 3,
        summary: "Dit is een placeholder samenvatting van de AI. De speler voelde zich goed na de training en heeft goed geslapen.",
    }
];


export const placeholderPlayerUpdates: PlayerUpdate[] = [
    {
        id: "update-1",
        title: "Goed Bezig met Slapen!",
        content: "Je slaapt gemiddeld 8 uur per nacht, wat meer is dan het teamgemiddelde van 7.5 uur. Een goede nachtrust is cruciaal voor je herstel!",
        category: "Sleep",
        date: new Date().toISOString().split("T")[0],
    },
    {
        id: "update-2",
        title: "Tip voor je Maaltijd",
        content: "We merken dat je vaak kort voor de training eet. Probeer je maaltijd 2-3 uur van tevoren te plannen voor optimale energie. De meest populaire pre-training maaltijd in je team is pasta.",
        category: "Nutrition",
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 2 days ago
    },
     {
        id: "update-3",
        title: "Motivatie op Peil",
        content: "Je motivatiescore is de afgelopen week consistent hoog gebleven. Dat is een geweldige mindset, hou dat vast!",
        category: "Motivation",
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 3 days ago
    }
]
