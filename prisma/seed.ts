import { PrismaClient } from "@prisma/client";
import { seedDemoIncomingLikes } from "../src/lib/demo-matches";

const prisma = new PrismaClient();

const profiles = [
  ["Aarav", 23, "Aarav%20Sharma", "Delhi", "Foodie, Travel, Music", "Building products and collecting passport stamps.", "Product Designer", "MAN"],
  ["Meera", 24, "Meera%20Kapoor", "Mumbai", "Yoga, Coffee, Art", "Morning yoga, late-night art walks, and the perfect cortado.", "Architect", "WOMAN"],
  ["Kabir", 25, "Kabir%20Singh", "Bengaluru", "Cycling, Tech, Hiking", "Startup tinkerer who believes every Sunday should involve a trail.", "Software Engineer", "MAN"],
  ["Ishita", 23, "Ishita%20Rao", "Pune", "Books, Baking, Cinema", "Novels, fresh bakes, and obscure films.", "Content Writer", "WOMAN"],
  ["Rohan", 26, "Rohan%20Mehta", "Gurugram", "Fitness, Music, Travel", "Gym regular, concert enthusiast, weekend explorer.", "Consultant", "MAN"],
  ["Anaya", 22, "Anaya%20Verma", "Jaipur", "Dance, Fashion, Food", "Dance floor first, dessert second.", "Fashion Stylist", "WOMAN"],
  ["Vihaan", 24, "Vihaan%20Joshi", "Hyderabad", "Photography, Cricket, Travel", "Usually found behind a camera or at a cricket ground.", "Photographer", "MAN"],
  ["Saanvi", 25, "Saanvi%20Iyer", "Chennai", "Classical Music, Reading, Beach", "Carnatic music, old books, and seaside sunsets.", "Researcher", "WOMAN"],
  ["Arjun", 27, "Arjun%20Nair", "Kochi", "Surfing, Cooking, Movies", "Cooking for friends and chasing the next swell.", "Chef", "MAN"],
  ["Zara", 23, "Zara%20Khan", "Ahmedabad", "Art, Travel, Cafe", "Sketchbook always, plans sometimes.", "Illustrator", "WOMAN"],
  ["Reyansh", 24, "Reyansh%20Gupta", "Lucknow", "Running, Startups, Chess", "Running marathons and debating opening moves.", "Founder", "MAN"],
  ["Navya", 22, "Navya%20Bhat", "Mysuru", "Nature, Poetry, Tea", "Birdwatcher with a soft spot for handwritten poems.", "Student", "WOMAN"],
  ["Dev", 26, "Dev%20Malhotra", "Chandigarh", "Cars, Hiking, Gaming", "Mountain roads and boss battles.", "Automotive Engineer", "MAN"],
  ["Kiara", 24, "Kiara%20Pillai", "Goa", "Ocean, Wellness, Music", "Ocean swimmer and wellness optimist.", "Yoga Instructor", "WOMAN"],
  ["Aditya", 25, "Aditya%20Chopra", "Noida", "Football, Podcasts, Travel", "Football on weekends, podcasts on commutes.", "Sales Manager", "MAN"],
  ["Tara", 23, "Tara%20Sen", "Kolkata", "Theatre, Photography, Books", "Theatre nerd documenting the city frame by frame.", "Actor", "WOMAN"],
  ["Vivaan", 28, "Vivaan%20Reddy", "Bengaluru", "Technology, Running, Wine", "Building AI by day and trail-running by dawn.", "Data Scientist", "MAN"],
  ["Nisha", 24, "Nisha%20Das", "Bhubaneswar", "Dancing, Design, Cafes", "Designing interfaces and dancing to bad pop music.", "UX Designer", "WOMAN"],
  ["Aryan", 25, "Aryan%20Saxena", "Indore", "Food, Travel, Cricket", "Always looking for the next great street-food stall.", "Entrepreneur", "MAN"],
  ["Myra", 22, "Myra%20Jain", "Bhopal", "Museums, Cooking, Yoga", "Museum afternoons and ambitious dinner plans.", "Medical Student", "WOMAN"],
  ["Samar", 27, "Samar%20Kulkarni", "Nagpur", "Music, Biking, Coding", "Indie playlists and night rides.", "Developer", "UNDISCLOSED"],
  ["Diya", 24, "Diya%20Menon", "Thiruvananthapuram", "Beach, Reading, Baking", "Bookshops, sea breeze, and cinnamon rolls.", "Marketing Manager", "WOMAN"],
  ["Kiran", 25, "Kiran%20Bose", "Patna", "History, Coffee, Hiking", "History buff, coffee snob, accidental hiker.", "Historian", "NON_BINARY"],
  ["Aarya", 23, "Aarya%20Shah", "Surat", "Fashion, Travel, Brunch", "Color, texture, and bottomless brunch.", "Brand Designer", "ANOTHER_IDENTITY"],
  ["Neil", 26, "Neil%20Arora", "Dehradun", "Outdoors, Film, Music", "Campfire conversations and 35mm film.", "Filmmaker", "MAN"],
  ["Avni", 24, "Avni%20Bansal", "Vadodara", "Painting, Plants, Cooking", "Plant parent and enthusiastic home cook.", "Interior Designer", "WOMAN"],
  ["Shaurya", 27, "Shaurya%20Gill", "Amritsar", "Cricket, Business, Food", "Cricket pitches and family recipes.", "Founder", "MAN"],
  ["Prisha", 22, "Prisha%20Roy", "Shillong", "Hiking, Music, Art", "Mountain person with paint under her nails.", "Art Student", "WOMAN"],
  ["Yash", 25, "Yash%20Patel", "Rajkot", "Cars, Gaming, Food", "Fast cars, slow dinners.", "Civil Engineer", "MAN"],
  ["Anika", 23, "Anika%20Pandey", "Varanasi", "Dance, Poetry, Travel", "Poetry on paper and ghazals in the evening.", "Copywriter", "WOMAN"],
  ["Dhruv", 26, "Dhruv%20Sethi", "Kota", "Teaching, Chess, Fitness", "Helping people learn and occasionally winning chess.", "Teacher", "MAN"],
  ["Aditi", 24, "Aditi%20Mishra", "Prayagraj", "Books, Chai, Theatre", "A good play, a better book, and cutting chai.", "Journalist", "WOMAN"],
  ["Ishan", 25, "Ishan%20Desai", "Vadodara", "Cycling, Street Food, Music", "Exploring the city one food stop at a time.", "Musician", "MAN"],
  ["Mahi", 23, "Mahi%20Fernandes", "Panaji", "Ocean, Photography, Dogs", "Sunsets, sea swims, and every dog I pass.", "Marine Biologist", "WOMAN"],
  ["Ritvik", 26, "Ritvik%20Sinha", "Ranchi", "Climbing, Coding, Coffee", "Always up for a bouldering session or a new brew.", "Developer", "MAN"],
  ["Simran", 22, "Simran%20Kaur", "Ludhiana", "Fashion, Food, Dance", "Punjabi music and spontaneous dance breaks.", "Fashion Student", "WOMAN"],
  ["Farah", 25, "Farah%20Ali", "Srinagar", "Gardens, Poetry, Travel", "Collecting quiet moments and handwritten verses.", "Landscape Designer", "WOMAN"],
  ["Nikhil", 27, "Nikhil%20Rao", "Visakhapatnam", "Surfing, Fitness, Film", "Early morning waves and late-night cinema.", "Fitness Coach", "MAN"],
  ["Tenzin", 24, "Tenzin%20Dawa", "Gangtok", "Hiking, Tea, Art", "Mountain trails and sketching whatever I find.", "Graphic Artist", "NON_BINARY"],
  ["Ira", 23, "Ira%20Mukherjee", "Guwahati", "Wildlife, Music, Cooking", "Birding trips, indie gigs, and big family dinners.", "Conservationist", "WOMAN"],
  ["Raghav", 28, "Raghav%20Pillai", "Kochi", "Sailing, History, Food", "Fascinated by old ports and new recipes.", "Historian", "MAN"],
  ["Noor", 24, "Noor%20Sheikh", "Aurangabad", "Architecture, Travel, Coffee", "Finding beauty in old buildings and small cafes.", "Architect", "ANOTHER_IDENTITY"],
  ["Pooja", 24, "Pooja%20Nair", "Thane", "Food, Music, Travel", "Weekend food trails and playlists for every mood.", "Food Writer", "WOMAN"],
  ["Kavya", 23, "Kavya%20Reddy", "Coimbatore", "Running, Books, Nature", "Bookshop browsing and easy morning runs.", "Teacher", "WOMAN"],
  ["Sana", 25, "Sana%20Khan", "Jodhpur", "Art, History, Coffee", "Old-city walks with a camera and a coffee stop.", "Curator", "WOMAN"],
  ["Leela", 22, "Leela%20Rao", "Mangaluru", "Swimming, Cooking, Music", "Trying new recipes and swimming before work.", "Student", "WOMAN"],
  ["Ishani", 24, "Ishani%20Roy", "Raipur", "Design, Plants, Cinema", "Collecting houseplants and great movie recommendations.", "Visual Designer", "WOMAN"],
  ["Mira", 26, "Mira%20Joseph", "Madurai", "Dance, Food, Travel", "Learning new dance styles and finding local favourites.", "Choreographer", "WOMAN"],
  ["Ritu", 23, "Ritu%20Sharma", "Kanpur", "Fitness, Poetry, Tea", "Gym in the morning, poetry and chai after.", "Physiotherapist", "WOMAN"],
  ["Ayesha", 25, "Ayesha%20Dutta", "Ranchi", "Hiking, Baking, Photography", "Always documenting the little things on a trail.", "Photographer", "WOMAN"],
  ["Nandini", 24, "Nandini%20Patel", "Nashik", "Wine, Cooking, Outdoors", "A vineyard afternoon and dinner with friends.", "Chef", "WOMAN"],
  ["Shreya", 22, "Shreya%20Gupta", "Meerut", "Theatre, Reading, Music", "I will absolutely recommend you a play.", "Actor", "WOMAN"],
  ["Amara", 26, "Amara%20Das", "Jalandhar", "Travel, Yoga, Culture", "Slow travel, good conversation, and a little yoga.", "Consultant", "WOMAN"],
  ["Roshni", 23, "Roshni%20Bose", "Guwahati", "Wildlife, Books, Food", "Nature walks and finding the best local thali.", "Biologist", "WOMAN"],
  ["Pari", 24, "Pari%20Mehta", "Faridabad", "Fashion, Art, Brunch", "Art markets, bold outfits, and long brunches.", "Stylist", "WOMAN"],
  ["Manav", 26, "Manav%20Kulkarni", "Pune", "Cycling, Books, Coffee", "Finding new roads and the cafes at the end.", "Engineer", "MAN"],
  ["Aman", 24, "Aman%20Verma", "Noida", "Football, Music, Food", "Five-a-side football followed by a proper meal.", "Analyst", "MAN"],
  ["Siddharth", 27, "Siddharth%20Jain", "Jaipur", "Photography, Travel, Design", "Chasing golden hour and thoughtful design.", "Art Director", "MAN"],
  ["Pranav", 25, "Pranav%20Menon", "Chennai", "Cooking, Fitness, Film", "Cooking for friends and rewatching old films.", "Doctor", "MAN"],
] as const;

const malePhotos = [
  "photo-1500648767791-00dcc994a43e",
  "photo-1506794778202-cad84cf45f1d",
  "photo-1507003211169-0a1dd7228f2d",
  "photo-1506794778214-e83f6ddf1b2d",
  "photo-1504257432389-52343af06ae3",
];
const femalePhotos = [
  "photo-1534528741775-53994a69daeb",
  "photo-1524504388940-b1c1722653e1",
  "photo-1517841905240-472988babdf9",
  "photo-1531123897727-8f129e1688ce",
  "photo-1529626455594-4ff0802cfb7e",
];

async function main() {
  const demoUser = {
      id: "demo_user",
      name: "Riya",
      age: 24,
      photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85",
      bio: "Open to good coffee, new places, and real conversations.",
      city: "Delhi",
      interests: "Coffee|Travel|Design",
      gender: "WOMAN",
      interestedIn: "EVERYONE",
      occupation: "Product Manager",
  };
  await prisma.user.upsert({
    where: { id: demoUser.id },
    update: demoUser,
    create: demoUser,
  });

  for (let i = 0; i < profiles.length; i++) {
    const [name, age, , city, interests, bio, occupation, gender] = profiles[i];
    const photos = gender === "WOMAN" ? femalePhotos : malePhotos;
    const user = {
      id: `user_${String(i + 1).padStart(2, "0")}`,
      name,
      age,
      photo: `https://images.unsplash.com/${photos[Math.floor(i / 2) % photos.length]}?auto=format&fit=crop&w=900&q=85`,
      bio,
      city,
      interests: interests.replace(/,\s*/g, "|"),
      gender,
      occupation,
    };
    await prisma.user.upsert({
      where: { id: user.id },
      update: user,
      create: user,
    });
  }

  const seededSwipes = [
    { swiperId: "user_01", targetUserId: "demo_user", action: "LIKE" as const },
    { swiperId: "user_03", targetUserId: "demo_user", action: "LIKE" as const },
    { swiperId: "user_08", targetUserId: "demo_user", action: "LIKE" as const },
    { swiperId: "user_12", targetUserId: "demo_user", action: "LIKE" as const },
    { swiperId: "user_18", targetUserId: "demo_user", action: "LIKE" as const },
    { swiperId: "demo_user", targetUserId: "user_05", action: "PASS" as const },
  ];
  for (const swipe of seededSwipes) {
    const existing = await prisma.swipe.findUnique({
      where: {
        swiperId_targetUserId: {
          swiperId: swipe.swiperId,
          targetUserId: swipe.targetUserId,
        },
      },
    });
    if (!existing) await prisma.swipe.create({ data: swipe });
  }

  const accounts = await prisma.user.findMany({
    where: { email: { not: null } },
    select: { id: true, gender: true, interestedIn: true },
  });
  for (const account of accounts) {
    await prisma.$transaction((transaction) => seedDemoIncomingLikes(transaction, account));
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
