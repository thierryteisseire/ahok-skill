import { run_migrations } from "./core/migrate";

run_migrations().then(() => {
    process.exit(0);
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
