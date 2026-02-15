import { useState } from "react";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";

const Contact = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);

      /**
       * 🔮 FUTURE BACKEND READY
       * await api.post("/contact", formData);
       */

      toast.success("Message sent successfully!", {
        description: "Our team will contact you shortly.",
      });

      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch {
      toast.error("Failed to send message. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  const contactInfo = [
    {
      icon: Phone,
      title: "Phone",
      value: "+91 90637 84294",
      href: "tel:+919063784294",
    },
    {
      icon: Mail,
      title: "Email",
      value: "samridhenterprise24@gmail.com",
      href: "mailto:samridhenterprise24@gmail.com",
    },
    {
      icon: MapPin,
      title: "Location",
      value: "Hyderabad, Telangana, India",
    },
    {
      icon: Clock,
      title: "Working Hours",
      value: "Mon – Sat: 9 AM – 6 PM",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 pb-16">
      {/* HEADER */}
      <div className="text-center pt-24 mb-16 px-6">
        <Badge className="bg-amber-100 text-amber-900 border-amber-300 mb-4">
          Get In Touch
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold text-amber-950 mb-4">
          Contact{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-700 to-orange-600">
            Us
          </span>
        </h1>
        <p className="text-lg text-amber-800 max-w-2xl mx-auto">
          Questions, feedback, or bulk orders — we’re here to help.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {/* INFO CARDS */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {contactInfo.map((item, i) => (
            <Card key={i} className="border-2 border-amber-200 bg-white">
              <CardContent className="p-6 text-center space-y-3">
                <item.icon className="w-8 h-8 mx-auto text-amber-700" />
                <h3 className="font-semibold text-amber-950">{item.title}</h3>
                {item.href ? (
                  <a
                    href={item.href}
                    className="text-amber-700 hover:text-amber-900"
                  >
                    {item.value}
                  </a>
                ) : (
                  <p className="text-amber-700">{item.value}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* FORM */}
          <Card className="border-2 border-amber-200 shadow-xl bg-white">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-amber-950">
                Send us a Message
              </CardTitle>
              <p className="text-amber-700">
                We reply within working hours.
              </p>
            </CardHeader>

            <CardContent>
              <form
                action="https://formsubmit.co/samridhenterprise24@gmail.com"
                method="POST"
                className="space-y-6"
              >
                {/* REQUIRED FormSubmit fields */}
                <input type="hidden" name="_captcha" value="false" />
                <input type="hidden" name="_subject" value="New Contact Message - GWAL Spices" />
                <input type="hidden" name="_next" value="http://localhost:3000/thank-you" />

                <div>
                  <label className="block text-sm font-medium text-amber-900 mb-2">
                    Your Name *
                  </label>
                  <Input name="name" required placeholder="Enter your name" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-amber-900 mb-2">
                    Email Address *
                  </label>
                  <Input name="email" type="email" required placeholder="your@email.com" />
                </div>

                {/* This makes reply go to user's email */}
                <input type="hidden" name="_replyto" value="{{email}}" />

                <div>
                  <label className="block text-sm font-medium text-amber-900 mb-2">
                    Phone Number
                  </label>
                  <Input name="phone" placeholder="+91 XXXXX XXXXX" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-amber-900 mb-2">
                    Message *
                  </label>
                  <Textarea name="message" required rows={5} />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white text-lg py-6"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>
          
          {/* WHATSAPP + MAP */}
          <div className="space-y-8">
            <Card className="border-2 border-green-300 bg-green-50">
              <CardContent className="p-6 text-center space-y-4">
                <h3 className="text-xl font-bold text-green-900">
                  Prefer WhatsApp?
                </h3>
                <p className="text-green-800">
                  Quick responses for urgent queries & bulk orders
                </p>
                <Button asChild className="bg-green-600 text-white">
                  <a
                    href="https://wa.me/919063784294"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Chat on WhatsApp
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-amber-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-950">
                  <MapPin className="w-5 h-5 text-amber-700" />
                  Visit Our Store
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-amber-800 leading-relaxed">
                  <strong className="text-amber-950">GWAL SPICES</strong><br />
                  6-6-37/3, Devi Nagar Colony, Bansilalpet, Kavadiguda, Hyderabad<br />
                  Telangana - 500080
                </p>
                <iframe
    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.7272410946925!2d78.48977157493569!3d17.424872683468646!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb99b31d7f77a5%3A0xb141c917081cf7bd!2sSamridh%20Enterprise(Gwal%20Spices)!5e0!3m2!1sen!2sin!4v1764842917083!5m2!1sen!2sin"
    width="100%"
    height="320"
    style={{ border: 0 }}
    allowFullScreen=""
    loading="lazy"
    referrerPolicy="no-referrer-when-downgrade"
  ></iframe>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
