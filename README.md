# ProjectPatty

My portfolio site that routes to published projects. 3D environment where you can control a character and run into portals that route to my published projects.

## Local Setup

1. Open a terminal in the repository root.
2. Install app dependencies:

```bash
npm run install:app
```

## Local Testing

Run the local dev server:

```bash
npm start
```

Then open http://localhost:4200.

Run unit tests:

```bash
npm test
```

## Local Production Build Check

To verify the same build used by Vercel:

```bash
npm run build:vercel
```

Build output is generated in `portfolio-app/dist/portfolio-app`.

## Available Root Scripts

- `npm run install:app` installs dependencies in `portfolio-app`.
- `npm start` runs Angular dev server.
- `npm test` runs unit tests.
- `npm run build` runs standard Angular production build.
- `npm run build:vercel` runs the Vercel-targeted build.
