import BookingClient from "./booking-client";

export default function BookRidePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold font-headline">Book Your Ride</h1>
        <p className="text-muted-foreground mt-2">
          Fill out the form below or use our AI assistant to get started.
        </p>
      </div>
      <BookingClient />
    </div>
  );
}
