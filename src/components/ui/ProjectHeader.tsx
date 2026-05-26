import Link from 'next/link'
import { Phone, MapPin, User, HardHat, Briefcase, ExternalLink, CalendarDays, Layers } from 'lucide-react'
import type { Project } from '@/types'

interface Props {
  project: Project
  backHref: string
  backLabel: string
  onTime: number
  buffer: number
  delayed: number
  role: string
}

export function ProjectHeader({ project, backHref, backLabel, onTime, buffer, delayed, role }: Props) {
  const mapEmbedSrc = project.location
    ? `https://maps.google.com/maps?q=${encodeURIComponent(project.location)}&output=embed&z=14`
    : null

  const statusStyle = {
    active: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-500',
    on_hold: 'bg-amber-100 text-amber-700',
  }[project.status] ?? 'bg-gray-100 text-gray-500'

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
        <Link href={backHref} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
          {backLabel}
        </Link>
        {(role === 'admin' || role === 'staff' || role === 'coordinator') && (
          <Link
            href={`/projects/${project.id}/edit`}
            className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg hover:border-gray-300 hover:bg-white transition-all"
          >
            Edit project
          </Link>
        )}
      </div>

      <div className="flex flex-col md:flex-row">
        {/* ── Left: project details ── */}
        <div className="flex-1 px-5 py-5 space-y-4">

          {/* Name + status + mob + floors */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle}`}>
                {project.status.replace('_', ' ')}
              </span>
              {project.floors && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  <Layers size={10} />
                  {project.floors}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900 mt-1">{project.client_name}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {project.mob_date && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <CalendarDays size={11} className="text-gray-400" />
                  Mob: {new Date(project.mob_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              )}
              {project.location && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <MapPin size={11} className="text-gray-400" />
                  {project.location}
                </span>
              )}
            </div>
            {project.notes && (
              <p className="text-xs text-gray-400 italic mt-1.5">{project.notes}</p>
            )}
          </div>

          {/* Stage stats */}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">{onTime} on time</span>
            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">{buffer} buffer</span>
            <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">{delayed} delayed</span>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Contact grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            {/* Client */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                <User size={15} className="text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Client</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{project.client_name}</p>
                {project.client_phone && (
                  <a href={`tel:${project.client_phone}`} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-0.5">
                    <Phone size={10} />
                    {project.client_phone}
                  </a>
                )}
              </div>
            </div>

            {/* Engineer */}
            {(project.engineer_name || project.engineer_phone) && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                  <HardHat size={15} className="text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Site Engineer</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">{project.engineer_name ?? 'Site Engineer'}</p>
                  {project.engineer_phone && (
                    <a href={`tel:${project.engineer_phone}`} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-0.5">
                      <Phone size={10} />
                      {project.engineer_phone}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Project Manager */}
            {project.project_manager && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Briefcase size={15} className="text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Project Manager</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">{project.project_manager}</p>
                </div>
              </div>
            )}

            {/* Location */}
            {project.location && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin size={15} className="text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Location</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">{project.location}</p>
                  {project.maps_link && (
                    <a href={project.maps_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-0.5">
                      <ExternalLink size={10} />
                      Open in Maps
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Map ── */}
        {mapEmbedSrc && (
          <div className="md:w-72 border-t md:border-t-0 md:border-l border-gray-100 flex flex-col">
            <div className="flex-1 relative min-h-48 md:min-h-0">
              <iframe
                src={mapEmbedSrc}
                className="absolute inset-0 w-full h-full"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Project location"
              />
            </div>
            {project.maps_link && (
              <a
                href={project.maps_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-gray-600 hover:text-green-700 hover:bg-green-50 border-t border-gray-100 transition-colors"
              >
                <ExternalLink size={12} />
                Open in Google Maps
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
