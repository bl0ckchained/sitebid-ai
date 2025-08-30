"use client";

export default function Home() {
  return (
    <main className="bg-gray-900 text-white min-h-screen p-10 font-sans">
      <section className="text-center">
        <h1 className="text-6xl font-extrabold mb-6 text-indigo-600">
          SiteBid AI
        </h1>
        <p className="text-xl mb-8 text-gray-400">
          AI-Powered Estimating Tool for Excavation Contractors
        </p>
        <p className="text-lg mb-6 text-gray-300">
          Get accurate bids for your projects in seconds, tailored for every
          excavation need.
        </p>
        <div className="space-x-6">
          <a
            href="/estimate/new/driveway"
            className="px-6 py-3 bg-indigo-600 text-lg font-semibold rounded-lg shadow-lg hover:scale-105 transform transition duration-300"
          >
            Start Driveway Estimate
          </a>
          <a
            href="/estimate/new/culvert"
            className="px-6 py-3 bg-green-600 text-lg font-semibold rounded-lg shadow-lg hover:scale-105 transform transition duration-300"
          >
            Start Culvert Estimate
          </a>
        </div>
      </section>

      {/* Section 1: Projects Overview */}
      <section className="mt-16 space-y-12">
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-4 text-gray-100">Our Specializations</h2>
          <p className="text-lg mb-8 text-gray-300">
            Whether you’re working on a residential driveway or a large septic
            field, SiteBid AI has you covered. Choose your project type and get
            an instant, detailed estimate.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
          <ProjectCard
            title="Driveways"
            description="Fast, accurate estimates for driveway grading and paving projects."
            link="/estimate/new/driveway"
          />
          <ProjectCard
            title="Culverts"
            description="Get precise estimates for culvert installation and drainage projects."
            link="/estimate/new/culvert"
          />
          <ProjectCard
            title="Ponds"
            description="Estimate excavation and pond construction costs with ease."
            link="/estimate/new/pond"
          />
          <ProjectCard
            title="Basements"
            description="Accurately calculate the cost of digging basements for new homes."
            link="/estimate/new/basement"
          />
          <ProjectCard
            title="Trench-Work"
            description="Estimate trenching projects for utility lines, drains, and more."
            link="/estimate/new/trench"
          />
          <ProjectCard
            title="Septic Systems"
            description="Get precise quotes for septic system installation and maintenance."
            link="/estimate/new/septic"
          />
        </div>
      </section>

      {/* Section 2: Call-to-Action */}
      <section className="mt-20 text-center">
        <h2 className="text-3xl font-bold mb-6 text-gray-100">Ready to Start?</h2>
        <p className="text-xl mb-8 text-gray-300">
          Save time and money with SiteBid AI’s accurate and instant estimates.
          Get started with your project today!
        </p>
        <div className="space-x-6">
          <a
            href="/estimate/new"
            className="px-8 py-4 bg-orange-600 text-lg font-semibold rounded-lg shadow-lg hover:scale-105 transform transition duration-300"
          >
            Get Your Estimate
          </a>
        </div>
      </section>

      {/* Section 3: Footer */}
      <footer className="mt-16 text-center">
        <p className="text-lg text-gray-400">© 2025 SiteBid AI - All Rights Reserved</p>
      </footer>
    </main>
  );
}

function ProjectCard({ title, description, link }: { title: string; description: string; link: string }) {
  return (
    <div className="bg-gray-800 text-gray-200 p-6 rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transform transition duration-300">
      <h3 className="text-2xl font-semibold mb-4 text-indigo-300">{title}</h3>
      <p className="text-lg mb-4 text-gray-400">{description}</p>
      <a
        href={link}
        className="inline-block px-6 py-2 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600 transition duration-300"
      >
        Get Estimate
      </a>
    </div>
  );
}
