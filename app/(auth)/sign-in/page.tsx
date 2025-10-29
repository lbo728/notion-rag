"use client";

import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();

  const handleContinue = () => {
    router.push("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-white p-8 shadow">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Notion RAG Chatbot
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Your personal knowledge archive assistant
          </p>
        </div>

        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            ℹ️ For development mode, authentication is not required. You can
            proceed directly to the chat interface.
          </p>
        </div>

        <button
          onClick={handleContinue}
          className="block w-full rounded-md bg-blue-600 px-4 py-2 text-center text-white transition hover:bg-blue-700"
        >
          Continue to Chat
        </button>
      </div>
    </div>
  );
}
