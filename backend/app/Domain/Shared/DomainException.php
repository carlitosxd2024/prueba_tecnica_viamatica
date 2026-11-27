<?php

namespace App\Domain\Shared;

use RuntimeException;

class DomainException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly int $status = 422,
        public readonly string $errorCode = 'ERR_DOMAIN',
        public readonly array $errors = [],
    ) {
        parent::__construct($message);
    }

    public static function validation(array $errors): self
    {
        return new self('Datos invalidos: ' . implode(' ', array_merge(...array_values($errors))), 422, 'ERR_VALIDATION', $errors);
    }
}
