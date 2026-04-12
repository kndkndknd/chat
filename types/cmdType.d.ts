export type cmdType = {
  cmd: string;
  property?: string;
  value?: string;
  flag?: boolean;
};

export type CmdType = {
  cmd: string;
  property?: string;
  value?: number;
  flag?: boolean;
  fade?: number;
  gain?: number;
};

export type CmdOptionType = {
  property?: string;
  value?: number;
  flag?: boolean;
  fade?: number;
  gain?: number;
  solo?: boolean;
  portament?: number;
};
