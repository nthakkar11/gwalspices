import { CheckCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";

const ThankYou = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50 px-4">
      <div className="bg-white border-2 border-amber-200 rounded-2xl shadow-2xl max-w-lg w-full text-center p-10">

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <CheckCircle className="w-20 h-20 text-green-600" />
        </div>

        {/* Heading */}
        <h1 className="text-4xl font-bold text-amber-950 mb-4">
          Thank You!
        </h1>

        {/* Message */}
        <p className="text-lg text-amber-800 mb-6 leading-relaxed">
          Your message has been sent successfully.  
          Our team at <strong>GWAL Spices</strong> will get back to you shortly.
        </p>

        {/* Divider */}
        <div className="h-px bg-amber-200 my-6" />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild className="bg-amber-600 hover:bg-amber-700 text-white">
            <Link to="/">Go to Home</Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="border-amber-400 text-amber-900 hover:bg-amber-50"
          >
            <Link to="/shop">Explore Products</Link>
          </Button>
        </div>

        {/* Footer Note */}
        <p className="text-sm text-amber-600 mt-8">
          📩 This message was sent to <strong>samridhenterprise24@gmail.com</strong>
        </p>
      </div>
    </div>
  );
};

export default ThankYou;
