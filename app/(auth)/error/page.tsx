export default function ErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Authentication Error</h1>
        <p className="mt-2 text-gray-600">
          Something went wrong during authentication
        </p>
        <a
          href="/sign-in"
          className="mt-4 inline-block text-blue-600 hover:underline"
        >
          Try again
        </a>
      </div>
    </div>
  );
}

