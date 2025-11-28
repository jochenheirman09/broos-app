
import { PlayerUpdate, WellnessScore, StaffUpdate, ClubUpdate } from "./types";

export const placeholderWellnessScores: WellnessScore[] = [
    {
        id: "placeholder-1",
        date: new Date().toISOString().split("T")[0],
        mood: 4,
        moodReason: "Speler gaf aan zich 'goed' te voelen.",
        stress: 2,
        stressReason: "Lichte stress door een aankomende toets.",
        sleep: 5,
        sleepReason: "Speler sliep 8 uur, wat een gezonde hoeveelheid is.",
        motivation: 5,
        motivationReason: "Kijkt uit naar de wedstrijd van het weekend.",
        rest: 3,
        restReason: "Had een rustdag maar heeft toch wat licht gesport.",
        familyLife: 4,
        familyLifeReason: "Gezellige avond gehad met familie.",
        school: 3,
        schoolReason: "School was 'oké', geen bijzonderheden.",
        hobbys: 5,
        hobbysReason: "Tijd gehad om te gamen met vrienden.",
        food: 4,
        foodReason: "Gezonde maaltijd gegeten voor de training.",
        injury: false,
        injuryReason: "Geen blessures gemeld.",
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
];


export const placeholderStaffUpdates: StaffUpdate[] = [
    {
        id: 'staff-update-1',
        title: 'Analyse Stressniveau U17',
        content: "Het gemiddelde stressniveau in team U17 is deze week met 15% gestegen. Dit valt samen met de examenperiode. Overweeg een korte, ontspannen training.",
        category: 'Player Wellness',
        date: new Date().toISOString().split("T")[0],
    },
    {
        id: 'staff-update-2',
        title: 'Verhoogd Blessurerisico',
        content: "Meerdere spelers in team U17 hebben een lage 'rust' score gerapporteerd na de intensieve wedstrijd van zaterdag. Let op signalen van overbelasting.",
        category: 'Injury Risk',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    },
];


export const placeholderClubUpdates: ClubUpdate[] = [
    {
        id: 'club-update-1',
        title: 'Clubbrede Slaapkwaliteit',
        content: "Team U15 toont de hoogste slaapkwaliteit van de hele club (gem. 8.2 uur), terwijl U19 achterblijft (gem. 6.8 uur). Overweeg een clubbrede workshop over slaaphygiëne voor de oudere teams.",
        category: 'Team Comparison',
        date: new Date().toISOString().split("T")[0],
    },
    {
        id: 'club-update-2',
        title: 'Trend: Schoolstress',
        content: "Over alle teams heen is 'school' het meest besproken negatieve onderwerp in de chats deze maand. Dit is een clubbrede trend die aandacht verdient.",
        category: 'Club Trends',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    }
];
