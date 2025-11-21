import { createContext } from 'react';

interface CreateMaletaModalContextType {
    isCreateMaletaVisible: boolean;
    initialAlbumId: string | null;
    setIsCreateMaletaVisible: (value: boolean) => void;
    openCreateMaletaModal: (albumId?: string, onSuccess?: () => void) => void;
    setOnMaletaCreated: (callback: (() => void) | null) => void;
}

export const CreateMaletaModalContext = createContext<CreateMaletaModalContextType>({
    isCreateMaletaVisible: false,
    initialAlbumId: null,
    setIsCreateMaletaVisible: (_: boolean) => { },
    openCreateMaletaModal: (_?: string, __?: () => void) => { },
    setOnMaletaCreated: (_: (() => void) | null) => { },
});
