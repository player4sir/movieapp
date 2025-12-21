import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/services/backup.service';
// import { getServerSession } from '@/lib/auth'; // Auth handled by middleware

// Force dynamic to avoid static generation issues
export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
    try {
        // 1. Auth check (Basic implementation, enhance with actual admin check)
        // In a real app, middleware should handle this or we check session here
        // const session = await getServerSession();
        // if (!session || session.user.role !== 'admin') {
        //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // }

        const backupData = await backupService.exportData();
        const filename = `backup_${new Date().toISOString().split('T')[0]}.json`;

        // Return as downloadable file
        return new NextResponse(JSON.stringify(backupData, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('Backup export failed:', error);
        return NextResponse.json(
            { error: 'Failed to export backup' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // 1. Auth check
        // if (!session || session.user.role !== 'admin') ...

        // 2. Parse file from request
        // We expect a raw JSON body or form-data file?
        // Let's support JSON body for simplicity if the file is read on client
        // Or Multipart form data.
        // Simplifying: The client will read the file and send JSON details.

        // Check Content-Type
        const contentType = request.headers.get('content-type') || '';

        let backupData;

        if (contentType.includes('application/json')) {
            backupData = await request.json();
        } else {
            return NextResponse.json(
                { error: 'Invalid content type. Please upload JSON.' },
                { status: 400 }
            );
        }

        if (!backupData) {
            return NextResponse.json({ error: 'No data provided' }, { status: 400 });
        }

        const result = await backupService.importData(backupData);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Backup import failed:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to import backup' },
            { status: 500 }
        );
    }
}
