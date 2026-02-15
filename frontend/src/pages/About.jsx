import { Award, Heart, Users, Target, Leaf, Clock } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';


const About = () => {
  const values = [
    {
      icon: Award,
      title: 'Quality First',
      description: 'We never compromise on quality. Every spice is tested and verified for purity.'
    },
    {
      icon: Heart,
      title: 'Made with Love',
      description: 'Traditional methods passed down through generations, made with care and dedication.'
    },
    {
      icon: Users,
      title: 'Customer Focused',
      description: 'Your satisfaction is our priority. We listen, adapt, and deliver excellence.'
    },
    {
      icon: Target,
      title: 'Mission Driven',
      description: 'To bring pure, authentic Indian spices to every kitchen across the nation.'
    },
    {
      icon: Leaf,
      title: 'Sustainable',
      description: 'Supporting local farmers and using eco-friendly practices in our processes.'
    },
    {
      icon: Clock,
      title: 'Time-Tested',
      description: 'Traditional stone-grinding and sun-drying methods preserve natural goodness.'
    }
  ];

  

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 pt-24 pb-16">
      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-br from-amber-900 to-orange-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-white/20 text-white border-white/30 mb-4 backdrop-blur-sm">
            About Us
          </Badge>
          <h1 className="text-6xl font-bold mb-6">
            Our <span className="text-amber-300">Story</span>
          </h1>
          <p className="text-xl text-amber-100 max-w-3xl mx-auto leading-relaxed">
            From humble beginnings to becoming a trusted name in authentic Indian spices,
            our journey is built on purity, tradition, and customer trust.
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <Badge className="bg-amber-100 text-amber-900 border-amber-300">
                Our Beginning
              </Badge>
              <h2 className="text-4xl font-bold text-amber-950">
                A Legacy of <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-700 to-orange-600">Purity & Trust</span>
              </h2>
              <p className="text-lg text-amber-800 leading-relaxed">
                Gwal Spices was built on a simple—but powerful—belief: every Indian home deserves access to pure, unadulterated spices that honour our culinary heritage.
              </p>
              <p className="text-lg text-amber-800 leading-relaxed">
                Today, we carefully source our spices from trusted and verified distributors who supply high-quality, naturally grown produce. Every spice is cleaned meticulously, hand-sorted, and sun-dried to maintain its natural oils, aroma, and true flavour. We process every batch in small lots to ensure consistency, purity, and the authentic taste your kitchen deserves.
              </p>
              <p className="text-lg text-amber-800 leading-relaxed">
                At GWAL, we don’t just deliver spices—
we deliver trust, purity, and the richness of real Indian tradition in every packet.
              </p>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-amber-200 to-orange-200 rounded-3xl opacity-20 blur-2xl"></div>
              <img
                src={"/"}
                alt="Our Journey"
                className="relative w-full h-auto rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="bg-amber-100 text-amber-900 border-amber-300 mb-4">
              Our Values
            </Badge>
            <h2 className="text-5xl font-bold text-amber-950 mb-4">
              What We <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-700 to-orange-600">Stand For</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <Card
                key={index}
                className="group border-2 border-amber-200 hover:border-amber-400 hover:shadow-2xl transition-all duration-500 bg-white"
              >
                <CardContent className="p-8 space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <value.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-amber-950">{value.title}</h3>
                  <p className="text-amber-700 leading-relaxed">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-amber-900 to-orange-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-bold mb-6">
            Join Our Growing Family
          </h2>
          <p className="text-xl text-amber-100 mb-8">
            Experience the difference that pure, authentic spices can make in your cooking.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a
              href="/products"
              className="inline-block px-8 py-4 bg-white text-amber-900 rounded-lg font-semibold text-lg hover:bg-amber-50 transition-colors shadow-xl"
            >
              Explore Products
            </a>
            <a
              href="https://wa.me/919063784294"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 border-2 border-white text-white rounded-lg font-semibold text-lg hover:bg-white/10 transition-colors"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
export default About;