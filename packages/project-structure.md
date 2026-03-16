packages/sdf-kit/
├── src/
│   ├── core/
│   │   ├── types.ts
│   │   ├── constants.ts
│   │   ├── errors.ts
│   │   └── utils.ts
│   ├── producer/
│   │   ├── index.ts
│   │   ├── buildSDF.ts
│   │   ├── generatePDF.ts
│   │   └── packZIP.ts
│   ├── reader/
│   │   ├── index.ts
│   │   ├── parseSDF.ts
│   │   └── extractJSON.ts
│   ├── validator/
│   │   ├── index.ts
│   │   ├── validateSchema.ts
│   │   ├── validateMeta.ts
│   │   └── checkVersion.ts
│   └── index.ts
├── tests/
│   ├── producer.test.ts
│   ├── reader.test.ts
│   └── validator.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts


---


Output

/mnt/user-data/outputs/packages/sdf-kit/.gitignore
/mnt/user-data/outputs/packages/sdf-kit/package.json
/mnt/user-data/outputs/packages/sdf-kit/src/core/constants.ts
/mnt/user-data/outputs/packages/sdf-kit/src/core/errors.ts
/mnt/user-data/outputs/packages/sdf-kit/src/core/index.ts
/mnt/user-data/outputs/packages/sdf-kit/src/core/types.ts
/mnt/user-data/outputs/packages/sdf-kit/src/core/utils.ts
/mnt/user-data/outputs/packages/sdf-kit/src/index.ts
/mnt/user-data/outputs/packages/sdf-kit/src/producer/buildSDF.ts
/mnt/user-data/outputs/packages/sdf-kit/src/producer/generatePDF.ts
/mnt/user-data/outputs/packages/sdf-kit/src/producer/index.ts
/mnt/user-data/outputs/packages/sdf-kit/src/producer/packZIP.ts
/mnt/user-data/outputs/packages/sdf-kit/src/reader/extractJSON.ts
/mnt/user-data/outputs/packages/sdf-kit/src/reader/index.ts
/mnt/user-data/outputs/packages/sdf-kit/src/reader/parseSDF.ts
/mnt/user-data/outputs/packages/sdf-kit/src/validator/checkVersion.ts
/mnt/user-data/outputs/packages/sdf-kit/src/validator/index.ts
/mnt/user-data/outputs/packages/sdf-kit/src/validator/validateMeta.ts
/mnt/user-data/outputs/packages/sdf-kit/src/validator/validateSchema.ts
/mnt/user-data/outputs/packages/sdf-kit/tests/producer.test.ts
/mnt/user-data/outputs/packages/sdf-kit/tests/reader.test.ts
/mnt/user-data/outputs/packages/sdf-kit/tests/validator.test.ts
/mnt/user-data/outputs/packages/sdf-kit/tsconfig.build.json
/mnt/user-data/outputs/packages/sdf-kit/tsconfig.json
/mnt/user-data/outputs/packages/sdf-kit/vitest.config.ts

Presented 26 files

-----



cd ~/Desktop/githubs/sdf
npx changeset init