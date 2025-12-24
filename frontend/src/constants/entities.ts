import {
    User, Mail, Phone, Globe, CreditCard, MapPin, Link as LinkIcon,
    Trash2, Save, Upload, ZoomIn, ZoomOut,
    Move, Shield, FileText, MousePointer2, Eraser, Search,
    Smartphone, Server, Building, X,
    GitBranch, CircleDot, Grid, Eye, EyeOff, Edit3,
    Coins, AtSign, Camera, Download, ChevronDown, FolderOpen,
    Bitcoin, Landmark, Network
} from 'lucide-react';

export const ENTITY_CONFIG: any = {
    target: {
        label: 'OBJETIVO',
        color: '#ef4444',
        icon: User,
        fields: [
            { key: 'name', label: 'NOMBRE COMPLETO' },
            { key: 'alias', label: 'ALIAS / APODO' },
            { key: 'dob', label: 'FECHA NACIMIENTO' },
            { key: 'cob', label: 'LUGAR NACIMIENTO' },
            { key: 'national_id', label: 'DNI / PASAPORTE' },
            { key: 'nationality', label: 'NACIONALIDAD' },
            { key: 'gender', label: 'GÉNERO' },
            { key: 'occupation', label: 'OCUPACIÓN' },
            { key: 'employer', label: 'EMPLEADOR' },
            { key: 'risk_score', label: 'NIVEL RIESGO' },
            { key: 'last_seen', label: 'ÚLTIMA VEZ VISTO' },
            { key: 'status', label: 'ESTADO' },
            { key: 'tags', label: 'ETIQUETAS' },
            { key: 'notes', label: 'NOTAS DE INTELIGENCIA' },
            { key: 'last_update', label: 'ÚLTIMA ACTUALIZACIÓN' }
        ]
    },
    ip: {
        label: 'DIRECCIÓN IP',
        color: '#06b6d4',
        icon: Network,
        fields: [
            { key: 'ip', label: 'DIRECCIÓN IP' },
            { key: 'time', label: 'HORA DETECTADA' },
            { key: 'asn', label: 'ASN' },
            { key: 'isp', label: 'PROVEEDOR ISP' },
            { key: 'organization', label: 'ORGANIZACIÓN' },
            { key: 'country', label: 'PAÍS' },
            { key: 'city', label: 'CIUDAD' },
            { key: 'lat', label: 'LATITUD' },
            { key: 'lon', label: 'LONGITUD' },
            { key: 'timezone', label: 'ZONA HORARIA' },
            { key: 'ports', label: 'PUERTOS' },
            { key: 'os', label: 'SISTEMA OPERATIVO' },
            { key: 'vulns', label: 'VULNERABILIDADES' },
            { key: 'reverse_dns', label: 'DNS REVERSO' },
            { key: 'proxy', label: 'PROXY / VPN?' },
            { key: 'tor', label: 'NODO TOR?' },
            { key: 'risk_score', label: 'PUNTUACIÓN ABUSE' },
            { key: 'last_update', label: 'ÚLTIMA ACTUALIZACIÓN' }
        ]
    },
    email: {
        label: 'EMAIL',
        color: '#eab308',
        icon: Mail,
        fields: [
            { key: 'email', label: 'DIRECCIÓN EMAIL' },
            { key: 'user', label: 'USUARIO' },
            { key: 'domain', label: 'DOMINIO' },
            { key: 'status', label: 'ESTADO' },
            { key: 'leaks', label: 'FILTRACIONES / BRECHAS' },
            { key: 'provider', label: 'PROVEEDOR' },
            { key: 'disposable', label: '¿ES DESECHABLE?' },
            { key: 'breached', label: '¿ESTÁ FILTRADO?' },
            { key: 'last_breach', label: 'FECHA ÚLTIMA FILTRACIÓN' },
            { key: 'social_profiles', label: 'PERFILES SOCIALES' },
            { key: 'gravatar', label: '¿TIENE GRAVATAR?' },
            { key: 'domain_age', label: 'ANTIGÜEDAD DOMINIO' },
            { key: 'score', label: 'PUNTUACIÓN DE ENTREGA' },
            { key: 'last_update', label: 'ÚLTIMA ACTUALIZACIÓN' }
        ]
    },
    phone: {
        label: 'TELÉFONO',
        color: '#22c55e',
        icon: Phone,
        fields: [
            { key: 'number', label: 'NÚMERO TELÉFONO' },
            { key: 'countryCode', label: 'CÓDIGO PAÍS' },
            { key: 'carrier', label: 'OPERADOR' },
            { key: 'type', label: 'TIPO DE LÍNEA' },
            { key: 'whatsapp', label: '¿TIENE WHATSAPP?' },
            { key: 'telegram', label: '¿TIENE TELEGRAM?' },
            { key: 'location', label: 'UBICACIÓN' },
            { key: 'cnam', label: 'IDENTIFICADOR (CNAM)' },
            { key: 'valid', label: '¿NÚMERO VÁLIDO?' },
            { key: 'last_update', label: 'ÚLTIMA ACTUALIZACIÓN' }
        ]
    },
    domain: {
        label: 'DOMINIO',
        color: '#8b5cf6',
        icon: Globe,
        fields: [
            { key: 'domain', label: 'DOMINIO' },
            { key: 'ips', label: 'DIRECCIONES IP' },
            { key: 'mx_records', label: 'REGISTROS MX' },
            { key: 'servers', label: 'SERVIDORES DE NOMBRES' },
            { key: 'txt_records', label: 'REGISTROS TXT' },
            { key: 'registrar', label: 'REGISTRADOR' },
            { key: 'creation_date', label: 'FECHA CREACIÓN' },
            { key: 'expiry_date', label: 'FECHA EXPIRACIÓN' },
            { key: 'status', label: 'ESTADO' },
            { key: 'whois_privacy', label: '¿PRIVACIDAD WHOIS?' },
            { key: 'subdomains', label: 'SUBDOMINIOS' },
            { key: 'ssl_issuer', label: 'EMISOR SSL' },
            { key: 'last_update', label: 'ÚLTIMA ACTUALIZACIÓN' }
        ]
    },
    crypto: {
        label: 'CRYPTO WALLET',
        color: '#f97316',
        icon: Bitcoin,
        fields: [
            { key: 'address', label: 'DIRECCIÓN WALLET' },
            { key: 'currency', label: 'MONEDA' },
            { key: 'balance', label: 'SALDO' },
            { key: 'total_received', label: 'TOTAL RECIBIDO' },
            { key: 'total_sent', label: 'TOTAL ENVIADO' },
            { key: 'first_tx', label: 'PRIMERA TRANSACCIÓN' },
            { key: 'last_tx', label: 'ÚLTIMA TRANSACCIÓN' },
            { key: 'risk_level', label: 'NIVEL RIESGO AML' },
            { key: 'entity', label: 'ENTIDAD CONOCIDA' },
            { key: 'last_update', label: 'ÚLTIMA ACTUALIZACIÓN' }
        ]
    },
    identity: {
        label: 'IDENTIDAD SOCIAL',
        color: '#ec4899',
        icon: Smartphone,
        fields: [
            { key: 'platform', label: 'PLATAFORMA' },
            { key: 'username', label: 'USUARIO / HANDLE' },
            { key: 'userid', label: 'ID USUARIO' },
            { key: 'url', label: 'URL PERFIL' },
            { key: 'bio', label: 'BIOGRAFÍA' },
            { key: 'followers', label: 'SEGUIDORES' },
            { key: 'following', label: 'SIGUIENDO' },
            { key: 'creation_date', label: 'FECHA CREACIÓN' },
            { key: 'verified', label: '¿VERIFICADO?' },
            { key: 'last_update', label: 'ÚLTIMA ACTUALIZACIÓN' }
        ]
    },
    bank: {
        label: 'CUENTA BANCARIA',
        color: '#64748b',
        icon: Landmark,
        fields: [
            { key: 'iban', label: 'IBAN / NÚMERO' },
            { key: 'swift', label: 'SWIFT / BIC' },
            { key: 'bank_name', label: 'NOMBRE BANCO' },
            { key: 'holder', label: 'TITULAR' },
            { key: 'country', label: 'PAÍS' },
            { key: 'currency', label: 'MONEDA' },
            { key: 'branch', label: 'SUCURSAL' },
            { key: 'last_update', label: 'ÚLTIMA ACTUALIZACIÓN' }
        ]
    },
    location: {
        label: 'UBICACIÓN',
        color: '#10b981',
        icon: MapPin,
        fields: [
            { key: 'city', label: 'CIUDAD' },
            { key: 'country', label: 'PAÍS' },
            { key: 'lat', label: 'LATITUD' },
            { key: 'lon', label: 'LONGITUD' },
            { key: 'zip', label: 'CÓDIGO POSTAL' },
            { key: 'timezone', label: 'ZONA HORARIA' },
            { key: 'last_update', label: 'ÚLTIMA ACTUALIZACIÓN' }
        ]
    },
    company: {
        label: 'ORGANIZACIÓN',
        color: '#f59e0b',
        icon: Building,
        fields: [
            { key: 'name', label: 'NOMBRE' },
            { key: 'asn', label: 'ASN' },
            { key: 'isp', label: 'ISP' },
            { key: 'domain', label: 'DOMINIO WEB' },
            { key: 'address', label: 'DIRECCIÓN' },
            { key: 'registry', label: 'REGISTRO' },
            { key: 'last_update', label: 'ÚLTIMA ACTUALIZACIÓN' }
        ]
    },
    server: {
        label: 'SERVIDOR / SERVICIO',
        color: '#6366f1',
        icon: Server,
        fields: [
            { key: 'ports', label: 'PUERTOS ABIERTOS' },
            { key: 'os', label: 'SISTEMA OPERATIVO' },
            { key: 'vulns', label: 'VULNERABILIDADES' },
            { key: 'banner', label: 'BANNER SERVICIO' },
            { key: 'cpe', label: 'CPE' },
            { key: 'last_update', label: 'ÚLTIMA ACTUALIZACIÓN' }
        ]
    }
};
