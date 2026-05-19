import { useInViewAnimation } from '../hooks/useInViewAnimation';

type Project = {
  name: string;
  description: string;
  image: string;
};

type ProjectsSectionProps = {
  projects: Project[];
};

function ProjectItem({ description, image, name }: Project) {
  const { ref, isInView } = useInViewAnimation<HTMLDivElement>();

  return (
    <article
      className="flex flex-col gap-6"
      ref={ref}
    >
      <div
        className={(isInView ? 'animate-fade-in-up' : 'opacity-0') + ' ml-20 max-w-xl md:ml-28'}
        style={{ animationDelay: '0.1s' }}
      >
        <h3 className="font-serifAccent text-2xl font-semibold text-[#051A24] md:text-3xl">
          {name}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-[#051A24]/70 md:text-base">{description}</p>
      </div>

      <img
        alt={name}
        className={
          (isInView ? 'animate-fade-in-up' : 'opacity-0') +
          ' h-[260px] w-full rounded-2xl object-cover shadow-lg md:h-[520px]'
        }
        src={image}
        style={{ animationDelay: '0.2s' }}
      />
    </article>
  );
}

export function ProjectsSection({ projects }: ProjectsSectionProps) {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-12">
      <div className="flex flex-col gap-16 md:gap-20">
        {projects.map((project) => (
          <ProjectItem
            description={project.description}
            image={project.image}
            key={project.name}
            name={project.name}
          />
        ))}
      </div>
    </section>
  );
}
