import type { PipelineStage } from 'mongoose';
import type { BreakdownRow } from './types';

export const BREAKDOWN_LIMIT = 10;

/** $facet sub-pipeline: top values of `groupId` by unique visitors, then events. */
export function breakdown(groupId: unknown, preMatch?: Record<string, unknown>): PipelineStage.FacetPipelineStage[] {
  return [
    ...(preMatch ? [{ $match: preMatch }] : []),
    { $group: { _id: groupId, visitors: { $addToSet: '$visitorId' }, pageviews: { $sum: 1 } } },
    { $project: { _id: 1, visitors: { $size: '$visitors' }, pageviews: 1 } },
    { $sort: { visitors: -1, pageviews: -1 } },
    { $limit: BREAKDOWN_LIMIT },
  ];
}

type Raw = { _id: any; visitors: number; pageviews: number };

export function rows(raw: Raw[], label: (id: any) => string, code?: (id: any) => string | undefined): BreakdownRow[] {
  return raw.map((r) => ({
    label: label(r._id),
    code: code?.(r._id),
    visitors: r.visitors,
    pageviews: r.pageviews,
  }));
}

export const unknownLabel = (v: unknown) => (typeof v === 'string' && v ? v : 'Unknown');

/** The traffic-source facets shared by the site overview and the per-form view. */
export const sourceFacets = {
  referrers: breakdown('$referrerHost'),
  campaigns: breakdown({ source: '$utmSource', campaign: '$utmCampaign' }, { utmSource: { $exists: true, $ne: null } }),
  countries: breakdown({ code: '$countryCode', name: '$country' }),
  cities: breakdown({ city: '$city', country: '$country', code: '$countryCode' }),
  devices: breakdown('$deviceType'),
};

export function sourceRows(facets: Record<keyof typeof sourceFacets, Raw[]>) {
  return {
    referrers: rows(facets.referrers, (id) => (id ? id : 'Direct / none')),
    campaigns: rows(facets.campaigns, (id) => (id.campaign ? `${id.source} · ${id.campaign}` : id.source)),
    countries: rows(facets.countries, (id) => unknownLabel(id.name), (id) => id.code ?? undefined),
    cities: rows(
      facets.cities,
      (id) => (id.city ? `${id.city}${id.country ? `, ${id.country}` : ''}` : 'Unknown'),
      (id) => id.code ?? undefined
    ),
    devices: rows(facets.devices, (id) => (id ? id[0].toUpperCase() + id.slice(1) : 'Unknown')),
  };
}
