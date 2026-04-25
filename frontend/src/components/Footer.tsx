export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container mx-auto flex flex-col items-center justify-center gap-4 px-4 sm:px-6 md:px-8 lg:px-12 md:h-24 md:flex-row">
        <p className="mx-auto w-full max-w-3xl text-center text-sm text-muted-foreground">
          Welcome to aseed.ca! Questions? Email us at{" "}
          <a
            href="mailto:mcgillfoodco@gmail.com"
            className="text-red-500 underline hover:text-foreground"
          >
            mcgillfoodco@gmail.com
          </a>
          . Thank you so much for joining, I hope you find use from this platform - Ty
        </p>
      </div>
    </footer>
  );
}
