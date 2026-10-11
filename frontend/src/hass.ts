// The few parts of the Home Assistant frontend `hass` object the cards read.
export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
}

export interface HassEntityEntry {
  entity_id: string;
  device_id?: string | null;
  platform?: string;
  translation_key?: string;
}

export interface Hass {
  states: Record<string, HassEntity>;
  entities: Record<string, HassEntityEntry>;
}
