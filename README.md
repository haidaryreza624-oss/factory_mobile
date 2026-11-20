# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

### Cloud backup and recovery

Copy `.env.example` to `.env.local` and set `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the Supabase project URL and public
publishable key. Never put a Supabase secret/service-role key in the mobile app.

Deploy the Supabase migrations and the `factory-cloud` Edge Function to the
same project. The function uses a server-side Supabase secret key and stores
only a hash of the recovery code; the database table has no client role access.
Keep the recovery code outside the phone as well: uninstalling the app can
remove its SecureStore value.

The development-only Admin screen can also clear the local app database and
the app-owned cloud backup tables. To enable its password check, set
`FACTORY_ADMIN_RESET_PASSWORD` as a Supabase Edge Function secret; never add it
to `.env.local` or the mobile app. The cloud reset only truncates
`factory_cloud_backups` and `factory_recovery_attempts`; it does not clear
Supabase Auth, Storage, or other project data. The local reset is irreversible.

The Supabase CLI is a project development dependency. From the repository root,
link the project and deploy both resources:

```sh
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push --remote
npx supabase functions deploy factory-cloud
```

The current implementation sends one versioned factory snapshot per manual
sync (with automatic retries while the app is open and connected) and limits
each request to 1.5 MB. Configure Supabase and deploy its schema and function
before enabling this in the app. A live cloud project is required to validate
end-to-end backup and restore.

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **example** directory and create a blank **src/app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
