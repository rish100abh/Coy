export type Profile = {
  id: string;
  name: string;
  age: number;
  photo: string;
  bio: string;
  city: string;
  gender: string;
  interests: string[];
  occupation?: string | null;
};

export type MatchProfile = {
  id: string;
  name: string;
  age: number;
  photo: string;
  city: string;
  matchedAt: string;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
};

export type DemoProfile = {
  id: string;
  name: string;
  email: string;
  age: number;
  city: string;
  gender: string;
  interestedIn: string[];
  bio: string;
  occupation: string;
  photo?: string;
  interests?: string[];
};
