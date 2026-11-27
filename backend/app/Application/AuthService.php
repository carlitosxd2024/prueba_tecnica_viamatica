<?php

namespace App\Application;

use App\Domain\Shared\DomainException;
use App\Domain\User\UserRules;
use App\Infrastructure\Persistence\SqlServerGateway;

class AuthService
{
    private const MAX_INTENTOS = 3;

    public function __construct(
        private SqlServerGateway $db,
        private JwtService $jwt,
    ) {}

    /** @return array{token:string,user:array} */
    public function login(string $identificador, string $password, ?string $ip): array
    {
        $ttl = config('jwt.ttl_minutes');
        $u = $this->db->first('sp_Usuario_ObtenerLogin', ['Identificador' => $identificador, 'TtlMinutos' => $ttl]);

        if (!$u) {
            throw new DomainException('Credenciales invalidas.', 401, 'ERR_CREDENTIALS');
        }
        if ($u['Status'] === 'BLOQUEADO') {
            throw new DomainException('El usuario esta bloqueado por superar los 3 intentos fallidos. Contacte a un administrador.', 423, 'ERR_LOCKED');
        }
        if ($u['Status'] === 'INACTIVO') {
            throw new DomainException('El usuario esta inactivo. Contacte a un administrador.', 403, 'ERR_INACTIVE');
        }

        if (!password_verify($password, $u['Password'])) {
            $r = $this->db->first('sp_Login_RegistrarFallido', ['idUsuario' => $u['idUsuario'], 'Ip' => $ip]);
            if ($r['Status'] === 'BLOQUEADO') {
                throw new DomainException('Contrasena incorrecta. El usuario ha sido bloqueado tras 3 intentos fallidos.', 423, 'ERR_LOCKED');
            }
            $restantes = self::MAX_INTENTOS - (int) $r['IntentosFallidos'];
            throw new DomainException("Contrasena incorrecta. Intentos restantes: {$restantes}.", 401, 'ERR_CREDENTIALS');
        }

        if ($u['SessionActive'] === 'S') {
            throw new DomainException('Ya existe una sesion activa para este usuario. Cierre la otra sesion para continuar.', 409, 'ERR_SESSION_ACTIVE');
        }

        $s = $this->db->first('sp_Sesion_Iniciar', ['idUsuario' => $u['idUsuario'], 'Ip' => $ip]);
        $token = $this->jwt->issue((int) $u['idUsuario'], (int) $s['idSession']);

        return ['token' => $token, 'user' => $this->db->first('sp_Usuario_Obtener', ['idUsuario' => $u['idUsuario']])];
    }

    public function logout(int $idUsuario): void
    {
        $this->db->call('sp_Sesion_Cerrar', ['idUsuario' => $idUsuario]);
    }

    public function forgotPassword(string $mail): array
    {
        $token = bin2hex(random_bytes(32));
        $r = $this->db->first('sp_Password_SolicitarReset', [
            'Mail' => $mail, 'TokenHash' => hash('sha256', $token), 'Minutos' => 30,
        ]);

        $out = ['message' => 'Si el correo esta registrado, recibira instrucciones para restablecer su contrasena.'];
        if ($r && config('jwt.reset_dev_link')) {
            $out['devResetLink'] = rtrim(config('jwt.frontend_url'), '/') . '/reset-password?token=' . $token;
        }
        return $out;
    }

    public function resetPassword(string $token, string $password): void
    {
        $errors = UserRules::password($password);
        if ($errors) {
            throw DomainException::validation(['password' => $errors]);
        }
        $this->db->call('sp_Password_Restablecer', [
            'TokenHash'    => hash('sha256', $token),
            'PasswordHash' => password_hash($password, PASSWORD_BCRYPT),
        ]);
    }

    public function bienvenida(int $idUsuario): array
    {
        [$sesiones, $fallidos] = $this->db->call('sp_Sesion_Resumen', ['idUsuario' => $idUsuario]);
        return [
            'user'            => $this->db->first('sp_Usuario_Obtener', ['idUsuario' => $idUsuario]),
            'sesionActual'    => $sesiones[0] ?? null,
            'sesionAnterior'  => $sesiones[1] ?? null,
            'fallidosPrevios' => (int) ($sesiones[0]['IntentosFallidosPrevios'] ?? 0),
            'fallidosDesdeUltimoIngreso' => (int) ($fallidos[0]['FallidosActuales'] ?? 0),
        ];
    }
}
