'use client';

import React from 'react';
import DischargeHistory from '../components/DischargeHistory';

function DischargeHistoryPage() {
    return (
        <div className="mt-10 px-6">
            <DischargeHistory basePath="/discharge" />
        </div>
    );
}

export default React.memo(DischargeHistoryPage);
