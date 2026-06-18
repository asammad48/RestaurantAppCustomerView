export interface FeatureConfig {
  services: {
    delivery: {
      enabled: boolean;
    };
    takeaway: {
      enabled: boolean;
    };
    dineIn: {
      enabled: boolean;
      requireLogin: boolean;
      defaultSelected: boolean;
    };
    reservation: {
      enabled: boolean;
    };
  };
  payment: {
    cash: {
      enabled: boolean;
    };
    card: {
      enabled: boolean;
    };
    bankTransfer: {
      enabled: boolean;
    };
  };
  features: {
    splitBills: {
      enabled: boolean;
    };
    guestCheckout: {
      enabled: boolean;
      showWarning: boolean;
      warningMessage: string;
    };
  };
}

export const featureConfig: FeatureConfig = {
  services: {
    delivery: {
      enabled: false,
    },
    takeaway: {
      enabled: false,
    },
    dineIn: {
      enabled: true,
      requireLogin: false,
      defaultSelected: true,
    },
    reservation: {
      enabled: false,
    },
  },
  payment: {
    cash: {
      enabled: true,
    },
    card: {
      enabled: false,
    },
    bankTransfer: {
      enabled: false,
    },
  },
  features: {
    splitBills: {
      enabled: false,
    },
    guestCheckout: {
      enabled: true,
      showWarning: true,
      warningMessage: "If you proceed without logging in, your order history will not be saved and you won't be able to track your orders later.",
    },
  },
};
